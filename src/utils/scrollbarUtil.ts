const MIN_SIZE = 20;

export function getSpinSize(containerSize = 0, dataListHeight = 0) {
  let baseSize = (containerSize / dataListHeight) * containerSize;
  /*
  * barSize          containerSize
  * —————————————— = ——————————————
  * containerSize    dataListHeight
  *
  * barSize=containerSize*containerSize/dataListHeight
  * */

  if (isNaN(baseSize)) {
    baseSize = 0;
  }
  baseSize = Math.max(baseSize, MIN_SIZE);
  return Math.floor(baseSize);
}
