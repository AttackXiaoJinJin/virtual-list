import * as React from 'react';
import classNames from 'classnames';
import raf from 'rc-util/lib/raf';
import { useMemoizedFn } from 'ahooks';

export type ScrollBarDirectionType = 'ltr' | 'rtl';

export interface ScrollBarProps {
  prefixCls: string;
  overContainerHeight: number;
  dataListHeight: number;
  onScroll: (scrollOffset: number, horizontal?: boolean) => void;
  onStartMove: () => void;
  onStopMove: () => void;
  horizontal?: boolean;
  style?: React.CSSProperties;
  thumbStyle?: React.CSSProperties;
  scrollBarSize: number;
  containerSize: number;
}

export interface ScrollBarRef {
  delayHidden: () => void;
}

function getPageXY(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  horizontal: boolean,
) {
  const obj = 'touches' in e ? e.touches[0] : e;
  return obj[horizontal ? 'pageX' : 'pageY'];
}

const ScrollBar = React.forwardRef<ScrollBarRef, ScrollBarProps>((props, ref) => {
  const {
    prefixCls,
    overContainerHeight,
    dataListHeight,
    onStartMove,
    onStopMove,
    onScroll,
    horizontal,
    scrollBarSize,
    containerSize,
    style,
    thumbStyle: propsThumbStyle,
  } = props;

  const [dragging, setDragging] = React.useState(false);
  const [pageXY, setPageXY] = React.useState<number | null>(null);
  const [startScrollBarTop, setStartScrollBarTop] = React.useState<number | null>(null);
  console.log(pageXY,'pageXY52')
  // ========================= Refs =========================
  const scrollbarRef = React.useRef<HTMLDivElement>();
  const thumbRef = React.useRef<HTMLDivElement>();

  // ======================== Range =========================
  const dataListScrollRange = dataListHeight - containerSize || 0;
  const scrollBarScrollRange = containerSize - scrollBarSize || 0;

  const scrollBarTop = React.useMemo(() => {
    if (overContainerHeight === 0 || dataListScrollRange === 0) {
      return 0;
    }
    /*
    * overContainerHeight     scrollBarTop
    * ————————————————————  = ——————————————
    * dataListScrollRange     scrollBarScrollRange
    *
    * scrollBarTop = overContainerHeight*scrollBarScrollRange/dataListScrollRange
    * */


    return overContainerHeight*scrollBarScrollRange/dataListScrollRange
  }, [overContainerHeight, dataListScrollRange, scrollBarScrollRange]);

  // ====================== Container =======================
  const onContainerMouseDown: React.MouseEventHandler = e => {
    e.stopPropagation();
    e.preventDefault();
  };

  // ======================== Thumb =========================
  const stateRef = React.useRef({ scrollBarTop, dragging, pageY: pageXY, startScrollBarTop });
  stateRef.current = { scrollBarTop, dragging, pageY: pageXY, startScrollBarTop };

  const onThumbMouseDown = useMemoizedFn((e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
    setDragging(true);
    /* 开始拖拽时，记录下鼠标距离document距离和此时滚动条已滚动的距离 */
    setPageXY(getPageXY(e, horizontal));
    setStartScrollBarTop(stateRef.current.scrollBarTop);

    onStartMove();
    e.stopPropagation();
    e.preventDefault();
  })

  // ======================== Effect ========================

  // React make event as passive, but we need to preventDefault
  // Add event on dom directly instead.
  // ref: https://github.com/facebook/react/issues/9809
  // React.useEffect(() => {
  //   const onScrollbarTouchStart = (e: TouchEvent) => {
  //     e.preventDefault();
  //   };
  //
  //   const scrollbarEle = scrollbarRef.current;
  //   const thumbEle = thumbRef.current;
  //   scrollbarEle.addEventListener('touchstart', onScrollbarTouchStart);
  //   thumbEle.addEventListener('touchstart', onThumbMouseDown);
  //
  //   return () => {
  //     scrollbarEle.removeEventListener('touchstart', onScrollbarTouchStart);
  //     thumbEle.removeEventListener('touchstart', onThumbMouseDown);
  //   };
  // }, [onThumbMouseDown]);

  // Pass to effect
  const dataListScrollRangeRef = React.useRef<number>();
  dataListScrollRangeRef.current = dataListScrollRange;
  const scrollBarScrollRangeRef = React.useRef<number>();
  scrollBarScrollRangeRef.current = scrollBarScrollRange;

  React.useEffect(() => {
    if (dragging) {
      let moveRafId: number;

      const onMouseMove = (e: MouseEvent | TouchEvent) => {
        const {
          dragging: stateDragging,
          /* 鼠标按在滚动条的那一刻，距离文档顶部的距离 */
          pageY: statePageY,
          startScrollBarTop: stateStartScrollBarTop,
        } = stateRef.current;
        raf.cancel(moveRafId);

        if (stateDragging) {
          const mouseOffset = getPageXY(e, horizontal) - statePageY;
          let newScrollBarTop = stateStartScrollBarTop;
          newScrollBarTop += mouseOffset;

          const stateDataListScrollRange = dataListScrollRangeRef.current;
          const stateScrollBarScrollRange = scrollBarScrollRangeRef.current;

          const ptg: number = stateScrollBarScrollRange ? newScrollBarTop / stateScrollBarScrollRange : 0;

          /*
          * scrollBarTop/scrollBarScrollRange=dataListTop/dataListScrollRange
          * dataListTop=scrollBarTop*dataListScrollRange/scrollBarScrollRange
          * */

          let dataListTop = Math.ceil(ptg * stateDataListScrollRange);
          dataListTop = Math.max(dataListTop, 0);
          dataListTop = Math.min(dataListTop, stateDataListScrollRange);
          /* 算出scrollBar的偏移量后，通过requestAnimationFrame让dataList也要同步滚动 */
          moveRafId = raf(() => {
            onScroll(dataListTop, horizontal);
          });
        }
      };

      const onMouseUp = () => {
        setDragging(false);

        onStopMove();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);

        raf.cancel(moveRafId);
      };
    }
  }, [dragging,horizontal,onScroll,onStopMove]);

  // ======================== Render ========================
  const scrollbarPrefixCls = `${prefixCls}-scrollbar`;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    visibility: null,
    border:'1px red solid'
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 99,
    cursor: 'pointer',
    userSelect: 'none',
    border:'1px green solid'
  };

  if (horizontal) {
    // Container
    containerStyle.height = 8;
    containerStyle.left = 0;
    containerStyle.right = 0;
    containerStyle.bottom = 0;

    // Thumb
    thumbStyle.height = '100%';
    thumbStyle.width = scrollBarSize;
    thumbStyle.left = scrollBarTop;
  } else {
    // Container
    containerStyle.width = 8;
    containerStyle.top = 0;
    containerStyle.bottom = 0;
    containerStyle.right = 0;

    // Thumb
    thumbStyle.width = '100%';
    thumbStyle.height = scrollBarSize;
    thumbStyle.top = scrollBarTop;
  }

  return (
    <div
      ref={scrollbarRef}
      className={classNames(scrollbarPrefixCls, {
        [`${scrollbarPrefixCls}-horizontal`]: horizontal,
        [`${scrollbarPrefixCls}-vertical`]: !horizontal,
        [`${scrollbarPrefixCls}-visible`]: true,
      })}
      style={{ ...containerStyle, ...style }}
      onMouseDown={onContainerMouseDown}
    >
      <div
        ref={thumbRef}
        className={classNames(`${scrollbarPrefixCls}-thumb`, {
          [`${scrollbarPrefixCls}-thumb-moving`]: dragging,
        })}
        style={{ ...thumbStyle, ...propsThumbStyle }}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
});

export default ScrollBar;
