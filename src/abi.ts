import {
  IABIMethod,
  IETHABI,
} from "./ethjs-abi"

const {
  decodeParams,
  encodeMethod,
  logDecoder,
} = require("ethjs-abi") as IETHABI

import {
  ITransactionLog,
} from "./QtumRPC"

function ensureHex0x(hexstr: string): string {
  if (hexstr[0] === "0" && hexstr[1] === "x") {
    return hexstr
  }

  return "0x" + hexstr
}

export function encodeInputs(method: IABIMethod, args: any[] = []): string {
  // slice to strip the leading "0x"
  const calldata = encodeMethod(method, args).slice(2)
  return calldata
}

export function decodeOutputs(method: IABIMethod, outputData: string): any[] {
  const types = method.outputs.map((output) => output.type)
  const result = decodeParams(types, "0x" + outputData)

  // NB: Result is an "array-like" object like arguments.

  // But apparently the following clone technique doesn't work.
  // return Array.prototype.slice.call(result)

  // Convert result to normal array...
  const values = []
  for (let i = 0; i < types.length; i++) {
    values[i] = result[i]
  }

  return values
}

export interface IDecodedLog {
  // type is a reserved keyword in Solidity, so we can expect it
  // to be unused as an event parameter name
  type: string

  [key: string]: any
}

export function decodeLogs(methods: IABIMethod[], logs: ITransactionLog[]): IDecodedLog[] {
  const decoder = logDecoder(methods)

  // Add the 0x prefix to all hex strings, else abi parsing would fail
  const rawlogs = logs.map((log) => {
    return {
      address: ensureHex0x(log.address),
      data: ensureHex0x(log.data),
      topics: log.topics.map(ensureHex0x),
    }
  })

  const parsedLogs = decoder(rawlogs)

  // Remove the "array-like" behaviour. Just return a map of event parameters.
  return parsedLogs.map((log) => {
    const type = log._eventName

    const logABI = methods.find((method) => method.name === type)

    if (!logABI) {
      throw new Error(`Cannot find ABI for event type: ${type}`)
    }

    const decodedLog: IDecodedLog = {
      type,
    }

    // logABI.inputs.forEach(())
    for (const input of logABI.inputs) {
      decodedLog[input.name] = log[input.name] as any
    }

    return decodedLog
  })
}
