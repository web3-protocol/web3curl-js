
function formatBytes(hexBytes, verbosityLevel) {
    if(hexBytes == null || hexBytes == "") {
        hexBytes = "0x"
    }

    const lowVerbosityMaxSize = 128
    if(verbosityLevel < 3 && hexBytes.length > lowVerbosityMaxSize + 2) {
        hexBytes = hexBytes.substring(0, Math.round(lowVerbosityMaxSize / 2) + 2) + "..." + hexBytes.substring(hexBytes.length - Math.round(lowVerbosityMaxSize / 2))
    }

    return hexBytes;
}

export { formatBytes }