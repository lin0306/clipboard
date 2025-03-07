class StrUtil {
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
}
const strUtil = new StrUtil();
module.exports = strUtil;
window.StrUtil = strUtil;