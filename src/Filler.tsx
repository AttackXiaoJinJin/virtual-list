import * as React from 'react';
import ResizeObserver from 'rc-resize-observer';
import classNames from 'classnames';

export type InnerProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'role' | 'id'>;

interface FillerProps {
  prefixCls?: string;
  /** Virtual filler height. Should be `count * itemMinHeight` */
  height: number;
  /** Set offset of visible items. Should be the top of start item position */
  offsetY?: number;
  offsetX?: number;

  scrollWidth?: number;

  children: React.ReactNode;

  onInnerResize?: () => void;

  innerProps?: InnerProps;

  rtl: boolean;

  extra?: React.ReactNode;
}

/**
 * Fill component to provided the scroll content real height.
 */
const Filler = React.forwardRef(
  (
    {
      height,
      offsetY,
      offsetX,
      children,
      prefixCls,
      onInnerResize,
      innerProps,
      rtl,
      extra,
    }: FillerProps,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    let outerStyle: React.CSSProperties = {};

    let innerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
    };

    if (offsetY !== undefined) {
      // Not set `width` since this will break `sticky: right`
      outerStyle = {
        height,
        position: 'relative',
        overflow: 'hidden',
      };

      innerStyle = {
        ...innerStyle,
        transform: `translateY(${offsetY}px)`,
        [rtl ? 'marginRight' : 'marginLeft']: -offsetX,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
      };
    }
    console.log(children,'innerStyle71')

    return (
      /*长长的数据列表*/
      <div style={outerStyle}>
        {/*<ResizeObserver*/}
        {/*  onResize={({ offsetHeight }) => {*/}
        {/*    if (offsetHeight && onInnerResize) {*/}
        {/*      onInnerResize();*/}
        {/*    }*/}
        {/*  }}*/}
        {/*>*/}
          {/*已经渲染出的dom，比可视区域内多出一个item*/}
          <div
            style={innerStyle}
            className={classNames({
              // rc-virtual-list-holder-inner
              [`${prefixCls}-holder-inner`]: prefixCls,
            })}
            // ref={ref}
            {...innerProps}
          >
            {children}
            {extra}
          </div>
        {/*</ResizeObserver>*/}
      </div>
    );
  },
);

Filler.displayName = 'Filler';

export default Filler;
