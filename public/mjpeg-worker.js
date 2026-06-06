// MJPEG encoder worker
var canvas = null
var ctx = null

self.onmessage = function(e) {
  var bitmap = e.data.bitmap
  var width = e.data.width
  var height = e.data.height

  if (!canvas || canvas.width !== width || canvas.height !== height) {
    canvas = new OffscreenCanvas(width, height)
    ctx = canvas.getContext('2d')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 }).then(function(blob) {
    self.postMessage({ blob: blob })
  })
}
