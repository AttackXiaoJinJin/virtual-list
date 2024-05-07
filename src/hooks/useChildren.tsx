import * as React from 'react';
import type { RenderFunc } from '../interface';
import { Item } from '../Item';
import type { GetKey } from '../interface';

export default function useChildren<T>(
  data: T[],
  start: number,
  end: number,
  scrollWidth: number,
  setInstanceRef: (item: T, element: HTMLElement) => void,
  children: RenderFunc<T>,
  getKey:GetKey<T>,
) {
  console.log(start,end,'start15')

  /* 会多render一个item */
  // use reduce
  return data.slice(start, end + 1).map((item, index) => {
    const eleIndex = start + index;
    const node = children(item, eleIndex, {
      style: {
        width: scrollWidth,
      },
    }) as React.ReactElement;

    const key = getKey(item);
    return (
      <Item key={key} setRef={(ele) => {
        console.log(item,'item28')
        setInstanceRef(item, ele)
      }}>
        {node}
      </Item>
    );
  });
}
