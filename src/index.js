import jsQR from 'jsqr';
import qrcode from 'qrcode';
import { eventOn } from 'callforth';

// 裁剪ios微信二维码分享图片
const clipQrCode = async file => {
    try {
        const imgSrc = await filetoBase64(file);
        // 因为有存在不同图片读取不了的情况，尝试3次
        const dataurl = await retry(qrcodeTransfer, { imgSrc });
        return dataURLtoFile(dataurl, file.name);
    } catch (e) {
        console.error(e);
    }
};

// 将文件流转成base64
const filetoBase64 = async file => {
    let fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    const result = await eventOn(fileReader, 'load');
    return result.target.result;
};

/**
 * [qrcodeTransfer 二维码转义]
 * @param  {[String]}  imgSrc  [图片base64]
 * @param  {[Number]}  retries [尝试次数]
 * @return {Promise}         [裁剪后的图片base64]
 */
const qrcodeTransfer = async ({ imgSrc, retries }) => {
    let image = new Image();
    image.src = imgSrc;
    await eventOn(image, 'load');
    const scalingRatio = [1, 0.8, 0.5]; // 取3个缩放倍率去尝试绘制读取二维码
    const widthScaled = scalingRatio[3 - retries] * image.width;
    const heightScaled = scalingRatio[3 - retries] * image.height;
    let canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = widthScaled;
    canvas.height = heightScaled;
    // 将图片绘制到canvas上
    ctx.drawImage(image, 0, 0, widthScaled, heightScaled);
    // 获取图片信息
    let imageData = ctx.getImageData(0, 0, widthScaled, heightScaled);
    // 读取二维码信息
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
    });
    // 重新生成二维码
    return await qrcode.toDataURL(result.data, { margin: 1.5 });
};

// 重试
const retry = (fn, params, retries = 3, err = null) => {
    if (!retries) {
        return Promise.reject(err);
    }
    return fn({ ...params, retries }).catch(err => {
        return retry(fn, params, retries - 1, err);
    });
};

// 将base64转换为文件流
const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(',');
    let mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export default clipQrCode;
