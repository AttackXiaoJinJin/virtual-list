import * as React from 'react';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import classNames from 'classnames';
import type { ResizeObserverProps } from 'rc-resize-observer';
import ResizeObserver from 'rc-resize-observer';
import Filler from './Filler';
import type { InnerProps } from './Filler';
import type { ScrollBarDirectionType, ScrollBarRef } from './ScrollBar';
import ScrollBar from './ScrollBar';
import type { RenderFunc, SharedConfig, GetKey, ExtraRenderInfo } from './interface';
import useChildren from './hooks/useChildren';
import useHeights from './hooks/useHeights';
import useScrollTo from './hooks/useScrollTo';
import type { ScrollPos, ScrollTarget } from './hooks/useScrollTo';
import useDiffItem from './hooks/useDiffItem';
import useFrameWheel from './hooks/useFrameWheel';
import useMobileTouchMove from './hooks/useMobileTouchMove';
import useOriginScroll from './hooks/useOriginScroll';
import useLayoutEffect from 'rc-util/lib/hooks/useLayoutEffect';
import { getSpinSize } from './utils/scrollbarUtil';
import { useEvent } from 'rc-util';
import { useGetSize } from './hooks/useGetSize';
import { useMemoizedFn } from 'ahooks';

const EMPTY_DATA = [];

const ScrollStyle: React.CSSProperties = {
  overflowY: 'auto',
  overflowAnchor: 'none',
};

export interface ScrollInfo {
  x: number;
  y: number;
}

export type ScrollConfig = ScrollTarget | ScrollPos;

export type ScrollTo = (arg: number | ScrollConfig) => void;

export type ListRef = {
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
};

export interface ListProps<T> extends Omit<React.HTMLAttributes<any>, 'children'> {
  prefixCls?: string;
  children: RenderFunc<T>;
  data: T[];
  height?: number;
  itemHeight?: number;
  /** If not match virtual scroll condition, Set List still use height of container. */
  fullHeight?: boolean;
  itemKey: React.Key;
  component?: string | React.FC<any> | React.ComponentClass<any>;
  /** Set `false` will always use real scroll instead of virtual one */
  virtual?: boolean;
  direction?: ScrollBarDirectionType;
  /**
   * By default `scrollWidth` is same as container.
   * When set this, it will show the horizontal scrollbar and
   * `scrollWidth` will be used as the real width instead of container width.
   * When set, `virtual` will always be enabled.
   */
  /* 长长的数据列表的宽度，默认和容器一样宽也就是没有横向滚动条 */
  scrollWidth?: number;

  styles?: {
    horizontalScrollBar?: React.CSSProperties;
    horizontalScrollBarThumb?: React.CSSProperties;
    verticalScrollBar?: React.CSSProperties;
    verticalScrollBarThumb?: React.CSSProperties;
  };

  onScroll?: React.UIEventHandler<HTMLElement>;

  /**
   * Given the virtual offset value.
   * It's the logic offset from start position.
   */
  onVirtualScroll?: (info: ScrollInfo) => void;

  /** Inject to inner container props. Only use when you need pass aria related data */
  innerProps?: InnerProps;

}

export function RawList<T>(props: ListProps<T>, ref: React.Ref<ListRef>) {
  const {
    prefixCls = 'rc-virtual-list',
    className,
    height:containerHeight,
    itemHeight,
    fullHeight = true,
    style,
    data:_data,
    children,
    itemKey,
    virtual,
    direction,
    scrollWidth,
    component: Component = 'div',
    onScroll,
    onVirtualScroll,
    innerProps,
    styles,
    ...restProps
  } = props;
  // =============================== Item Key ===============================
  const getKey = useMemoizedFn<GetKey<T>>(
    (item: T) => {
      return item?.[itemKey as string];
    })

  // ================================ Height ================================
  const [setInstanceRef, collectHeight, heights, heightUpdatedMark] = useHeights(
    getKey,
  );

  // ================================= MISC =================================
  const useVirtual = !!(virtual !== false && containerHeight && itemHeight);
  const cachedHeights = React.useMemo(() =>  Object.values(heights.maps).reduce((total, curr) => total + curr, 0), [heights.id,heights.maps]);
  const inVirtual = useVirtual && _data && (Math.max(itemHeight * _data.length, cachedHeights) > containerHeight || Boolean(scrollWidth));
  const mergedClassName = classNames(prefixCls, className);
  const data = _data || EMPTY_DATA;
  const componentRef = useRef<HTMLDivElement>();

  // =============================== Item Key ===============================

  const [dataListOverContainerHeight, setDataListOverContainerHeight] = useState(0);
  console.log(dataListOverContainerHeight,'offsetTop132')
  /* 横向滚动条距离数据列表的偏移量，而不是容器 */
  const [offsetX, setOffsetX] = useState(0);
  const [scrollMoving, setScrollMoving] = useState(false);

  const onScrollbarStartMove = useMemoizedFn(() => {
    setScrollMoving(true);
  });
  const onScrollbarStopMove = useMemoizedFn(() => {
    setScrollMoving(false);
  });

  // ================================ Scroll ================================
  const syncScrollTop=useMemoizedFn((newTop: number | ((prev: number) => number))=> {
    setDataListOverContainerHeight((origin) => {
      let value: number;
      if (typeof newTop === 'function') {
        value = newTop(origin);
      } else {
        value = newTop;
      }

      const alignedTop = keepInRange(value);

      componentRef.current.scrollTop = alignedTop;
      return alignedTop;
    });
  })

  // ================================ Legacy ================================
  // Put ref here since the range is generate by follow
  // const rangeRef = useRef({ start: 0, end: data.length });

  const diffItemRef = useRef<T>();
  const [diffItem] = useDiffItem(data, getKey);
  diffItemRef.current = diffItem;

  // ========================== Visible Calculation =========================
  const {
    /* 长长的数据列表的高度 */
    dataListHeight,
    start,
    end,
    /* 就是移到可视容器外的item的个数+item高度，是累加的 */
    offsetY
  } = React.useMemo(() => {

    let itemTop = 0;
    let startIndex: number;
    let offsetY: number;
    let endIndex: number;
    // 这里取长度，我理解就是取一个快照，这样即使data.length改变了也不受影响
    const dataLen = data.length;
    for (let i = 0; i < dataLen; i += 1) {
      const item = data[i];
      const key = getKey(item);
      // 从已计算缓存的heightCache里获取每个item height
      const cacheHeight = heights.get(key);
      // item底部距离容器顶部的距离=item顶部距离+item高度
      const currentItemBottom = itemTop + (cacheHeight === undefined ? itemHeight : cacheHeight);
      // 根据容器顶部和item底部判断item是否在容器中
      if (currentItemBottom >= dataListOverContainerHeight && startIndex === undefined) {
        startIndex = i;
        offsetY = itemTop;
      }

      // 根据容器底部和item顶部判断item是否在容器中
      if (currentItemBottom > dataListOverContainerHeight + containerHeight && endIndex === undefined) {
        endIndex = i;
      }
// 为下一次循环赋初始值，也就是下一个item的top是上一个item的bottom
      /* fixme:算是优化？每个item是根据上一个item计算而来的，并不是每次都整体做计算 */
      itemTop = currentItemBottom;
    }
    console.log(`startIndex:${startIndex}`,`endIndex:${endIndex}`,`dataListOverContainerHeight:${dataListOverContainerHeight}`,'startIndex209')
    // fixme:实验下是什么情况，猜测是当滚动条已经移动到最底部后，再搜索忽然跳到中间数据时，会卡住
    if (startIndex === undefined) {
      startIndex = 0;
      offsetY = 0;
      // https://github.com/ant-design/ant-design/issues/37986
      endIndex = Math.ceil(containerHeight / itemHeight);
    }
    if (endIndex === undefined) {
      endIndex = data.length - 1;
    }
    // endIndex可能会超出data.length，所以最后再来个兜底
    // ps:我觉得只有 endIndex = Math.ceil(height / itemHeight); 这种情况会超出，只在这种情况防止下是不是更精确点
    endIndex = Math.min(endIndex + 1, data.length - 1);

    return {
      dataListHeight: itemTop,
      start: startIndex,
      end: endIndex,
      offsetY
    };
  }, [
    // inVirtual,
    // useVirtual,
    data,
    // heightUpdatedMark,
    containerHeight,
    dataListOverContainerHeight,
    getKey,
    heights,
    itemHeight,
  ]);
  // rangeRef.current.start = start;
  // rangeRef.current.end = end;

  // ================================= Size =================================
  const [containerSize, setContainerSize] = React.useState({ width: 0, height:containerHeight });

  const onGetContainerSize: ResizeObserverProps['onResize'] =useMemoizedFn( (containerSize) => {
    setContainerSize({
      width: containerSize.width || containerSize.offsetWidth,
      height: containerSize.height || containerSize.offsetHeight,
    });
  });

  // Hack on scrollbar to enable flash call
  const verticalScrollBarRef = useRef<ScrollBarRef>();
  const horizontalScrollBarRef = useRef<ScrollBarRef>();

  const horizontalScrollBarSize = React.useMemo(
    () => getSpinSize(containerSize.width, scrollWidth),
    [containerSize.width, scrollWidth],
  );
  /* scrollbar size怎么计算的，containerHeight和dataListHeight */
  const verticalScrollBarSize = React.useMemo(
    () => getSpinSize(containerSize.height, dataListHeight),
    [containerSize.height, dataListHeight],
  );
  // =============================== In Range ===============================
  // 记录滚动时，data容器和指定高度容器的最大可滚动高度
  const maxScrollHeight = dataListHeight - containerHeight;
  const maxScrollHeightRef = useRef(maxScrollHeight);
  maxScrollHeightRef.current = maxScrollHeight;
  // 当列表不可滚动时不阻止滚动
  // https://github.com/react-component/virtual-list/pull/55
  // fixme:当列表不可以滚动时，为什么滚动条还能滚动？
  // 控制滚动条滚动的范围，不至于离谱
  const keepInRange=useMemoizedFn((newScrollTop: number)=> {
    let newTop = newScrollTop;
    if (!Number.isNaN(maxScrollHeightRef.current)) {
      newTop = Math.min(newTop, maxScrollHeightRef.current);
    }
    newTop = Math.max(newTop, 0);
    return newTop;
  })

  const isScrollAtTop = dataListOverContainerHeight <= 0;
  const isScrollAtBottom = dataListOverContainerHeight >= maxScrollHeight;

  // const originScroll = useOriginScroll(isScrollAtTop, isScrollAtBottom);

  // ================================ Scroll ================================
  const getVirtualScrollInfo = useMemoizedFn(()=>{
    return {
      x: offsetX,
      y: dataListOverContainerHeight,
    }
  })

  const lastVirtualScrollInfoRef = useRef(getVirtualScrollInfo());

  const triggerScroll = useEvent(() => {
    if (onVirtualScroll) {
      const nextInfo = getVirtualScrollInfo();

      // Trigger when offset changed
      if (
        lastVirtualScrollInfoRef.current.x !== nextInfo.x ||
        lastVirtualScrollInfoRef.current.y !== nextInfo.y
      ) {
        onVirtualScroll(nextInfo);

        lastVirtualScrollInfoRef.current = nextInfo;
      }
    }
  });
  /* 鼠标拖拽同步到dataList滚动偏移量 */
  const onScrollBar=useMemoizedFn((newScrollOffset: number, horizontal?: boolean)=> {
    const newOffset = newScrollOffset;

    /* todo:横向滚动须立即更新offsetX，试下没有flushSync的情况 */
    if (horizontal) {
      console.log(newOffset,'newOffset326')
      flushSync(() => {
        setOffsetX(newOffset);
      });
      triggerScroll();
    } else {
      syncScrollTop(newOffset);
    }
  })

  // When data size reduce. It may trigger native scroll event back to fit scroll position
  const onFallbackScroll=useMemoizedFn((e: React.UIEvent<HTMLDivElement>)=> {
    const { scrollTop: newScrollTop } = e.currentTarget;
    if (newScrollTop !== dataListOverContainerHeight) {
      syncScrollTop(newScrollTop);
    }

    // Trigger origin onScroll
    onScroll?.(e);
    triggerScroll();
  })

  const keepInHorizontalRange = useMemoizedFn((nextOffsetLeft: number) => {
    let tmpOffsetLeft = nextOffsetLeft;
    const max = Boolean(scrollWidth) ? scrollWidth - containerSize.width : 0;
    tmpOffsetLeft = Math.max(tmpOffsetLeft, 0);
    tmpOffsetLeft = Math.min(tmpOffsetLeft, max);

    return tmpOffsetLeft;
  })
  /* function example(a: number, b: string): void {}，则 Parameters<typeof example> 的类型将是 [number, string] */
  const onWheelDelta: Parameters<typeof useFrameWheel>[3] = useEvent((offsetXY, fromHorizontal) => {
    // 横向滚动
    if (fromHorizontal) {
      console.log(offsetXY,'offsetXY359')
      // Horizontal scroll no need sync virtual position
      // flushSync(() => {
        setOffsetX((left) => {
          const nextOffsetLeft = left + (offsetXY);

          return keepInHorizontalRange(nextOffsetLeft);
        });
      // });

      triggerScroll();
    } else {
      syncScrollTop((top) => {
        const newTop = top + offsetXY;
        return newTop;
      });
    }
  });

  // Since this added in global,should use ref to keep update
  const [onRawWheel] = useFrameWheel(
    isScrollAtTop,
    isScrollAtBottom,
    Boolean(scrollWidth),
    onWheelDelta,
  );

  // Mobile touch move
  // useMobileTouchMove(useVirtual, componentRef, (deltaY, smoothOffset) => {
  //   if (originScroll(deltaY, smoothOffset)) {
  //     return false;
  //   }
  //
  //   onRawWheel({ preventDefault() {}, deltaY } as WheelEvent);
  //   return true;
  // });

  useLayoutEffect(() => {
    const componentEle = componentRef.current;
    /* 为什么不劫持onScroll而是onWheel事件是因为我们为了不让白屏，是想滚动的时候，阻止滚动（阻止滚动条默认行为是e.preventDefault），等渲染item完成后，
    * 通过scrollTop让滚动条移动到指定位置，但onScroll事件是滚动后才会触发UI事件，所以需要一个更前置的事件即onWheel
    *  */
    componentEle.addEventListener('wheel', onRawWheel);

    return () => {
      componentEle.removeEventListener('wheel', onRawWheel);
    };
  }, [useVirtual,onRawWheel]);

  // Sync scroll left
  useLayoutEffect(() => {
    if (scrollWidth) {
      setOffsetX((left) => {
        return keepInHorizontalRange(left);
      });
    }
  }, [containerSize.width, scrollWidth,keepInHorizontalRange]);

  // ================================= Ref ==================================
  const delayHideScrollBar = useMemoizedFn(() => {
    verticalScrollBarRef.current?.delayHidden();
    horizontalScrollBarRef.current?.delayHidden();
  });

  const scrollTo = useScrollTo<T>(
    componentRef,
    data,
    heights,
    itemHeight,
    getKey,
    () => {
      console.log('collectHeight421')
      return collectHeight(true)
    },
    syncScrollTop,
    delayHideScrollBar,
  );

  React.useImperativeHandle(ref, () => ({
    getScrollInfo: getVirtualScrollInfo,
    scrollTo: (config) => {
      function isPosScroll(arg: any): arg is ScrollPos {
        return arg && typeof arg === 'object' && ('left' in arg || 'top' in arg);
      }

      if (isPosScroll(config)) {
        // Scroll X
        if (config.left !== undefined) {
          setOffsetX(keepInHorizontalRange(config.left));
        }

        // Scroll Y
        scrollTo(config.top);
      } else {
        scrollTo(config);
      }
    },
  }));

  // ================================ Effect ================================
  // /** We need told outside that some list not rendered */
  // useLayoutEffect(() => {
  //   if (onVisibleChange) {
  //     const renderedList = data.slice(start, end + 1);
  //
  //     onVisibleChange(renderedList, data);
  //   }
  // }, [start, end, data]);

  // 已渲染出的item===================
  const renderedChildren = useChildren(
    data,
    start,
    end,
    scrollWidth,
    setInstanceRef,
    children,
    getKey,
  );

  let componentStyle: React.CSSProperties = null;
  if (containerHeight) {
    componentStyle = {
      [fullHeight ? 'height' : 'maxHeight']: containerHeight,
      ...ScrollStyle,
      border:'4px green solid'
    };

    if (useVirtual) {
      componentStyle.overflowY = 'hidden';

      if (scrollWidth) {
        componentStyle.overflowX = 'hidden';
      }

      if (scrollMoving) {
        componentStyle.pointerEvents = 'none';
      }
    }
  }


  return (<div
      style={{
        ...style,
        position: 'relative',
      }}
      className={mergedClassName}
      {...restProps}
    >
      <ResizeObserver onResize={onGetContainerSize}>
        {/*可视区域*/}
        <Component
          className={`${prefixCls}-holder`}
          style={componentStyle}
          ref={componentRef}
          onScroll={onFallbackScroll}
          onMouseEnter={delayHideScrollBar}
        >
          <Filler
            prefixCls={prefixCls}
            innerProps={innerProps}

            dataListHeight={dataListHeight}
            offsetX={offsetX}
            offsetY={offsetY}
            collectHeight={collectHeight}
          >
            {renderedChildren}
          </Filler>
        </Component>
      </ResizeObserver>
      {/* 纵向滚动条 */}
      {inVirtual && dataListHeight > containerHeight && (
        <ScrollBar
          ref={verticalScrollBarRef}
          prefixCls={prefixCls}
          overContainerHeight={dataListOverContainerHeight}
          dataListHeight={dataListHeight}
          onScroll={onScrollBar}
          onStartMove={onScrollbarStartMove}
          onStopMove={onScrollbarStopMove}
          scrollBarSize={verticalScrollBarSize}
          containerSize={containerSize.height}
          style={styles?.verticalScrollBar}
          thumbStyle={styles?.verticalScrollBarThumb}
        />
      )}
      {/* 横向滚动条 */}
      {inVirtual && scrollWidth > containerSize.width && (
        <ScrollBar
          ref={horizontalScrollBarRef}
          prefixCls={prefixCls}
          overContainerHeight={offsetX}
          dataListHeight={scrollWidth}
          onScroll={onScrollBar}
          onStartMove={onScrollbarStartMove}
          onStopMove={onScrollbarStopMove}
          scrollBarSize={horizontalScrollBarSize}
          containerSize={containerSize.width}
          horizontal
          style={styles?.horizontalScrollBar}
          thumbStyle={styles?.horizontalScrollBarThumb}
        />
      )}
    </div>
  );
}

const List = React.forwardRef<ListRef, ListProps<any>>(RawList);

export default List as <Item = any>(
  props: ListProps<Item> & { ref?: React.Ref<ListRef> },
) => React.ReactElement;
