/** MPD 引数・ファイルパスで拒否する ASCII 制御文字（NUL / CR / LF） */
export function hasAsciiControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0 || code === 10 || code === 13) return true;
  }
  return false;
}
