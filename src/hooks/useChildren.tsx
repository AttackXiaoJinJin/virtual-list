import * as React from 'react';
import type { SharedConfig, RenderFunc } from '../interface';
import { Item } from '../Item';
import { GetKey } from '../interface';

export default function useChildren<T>(
  data: T[],
  start: number,
  end: number,
  scrollWidth: number,
  setInstanceRef: (item: T, element: HTMLElement) => void,
  renderFunc: RenderFunc<T>,
  getKey:GetKey<T>,
) {
  return data.slice(start, end + 1).map((item, index) => {
    const eleIndex = start + index;
    const node = renderFunc(item, eleIndex, {
      style: {
        width: scrollWidth,
      },
    }) as React.ReactElement;

    const key = getKey(item);
    return (
      <Item key={key} setRef={(ele) => setInstanceRef(item, ele)}>
        {node}
      </Item>
    );
  });
}
