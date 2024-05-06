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
  children: React.ReactNode;
  innerProps?: InnerProps;
  collectHeight: () => void;
}

/**
 * Fill component to provided the scroll content real height.
 */
function Filler({
                  prefixCls,
                  innerProps,
                  height,
                  offsetY,
                  offsetX,
                  children,
                  collectHeight
                }: FillerProps){


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
        marginLeft: -offsetX,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
      };
    }

    return (
      /*长长的数据列表*/
      <div style={outerStyle}>
        {/* 滚动时已渲染的dom列表的高度因为不定高，所以也会随着滚动而高度变化 */}
        <ResizeObserver
          onResize={({ offsetHeight:renderedDataHeight }) => {
            // offsetHeight就是渲染的dom的height
            console.log('collectHeight66')
            collectHeight();
          }}
        >
          {/*已经渲染出的dom，比可视区域内多出一个item*/}
          <div
            style={innerStyle}
            className={classNames({
              // rc-virtual-list-holder-inner
              [`${prefixCls}-holder-inner`]: prefixCls,
            })}
            {...innerProps}
          >
            {children}
          </div>
        </ResizeObserver>
      </div>
    );
}

Filler.displayName = 'Filler';

export default Filler;
