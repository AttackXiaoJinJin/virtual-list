import * as React from 'react';
import { useMemoizedFn } from 'ahooks';

export interface ItemProps {
  children: React.ReactElement;
  setRef: (element: HTMLElement) => void;
}

export function Item({ children, setRef }: ItemProps) {
  const refFunc = useMemoizedFn((node) => {
    setRef(node);
  })

  return React.cloneElement(children, {
    ref: refFunc,
  });
}
