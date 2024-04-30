import * as React from 'react';
import { findListDiffIndex } from '../utils/algorithmUtil';
import type { GetKey } from '../interface';
import { useRef } from 'react';

export default function useDiffItem<T>(
  data: T[],
  getKey: GetKey<T>,
): [T] {
  const prevData=useRef(data)
  const [diffItem, setDiffItem] = React.useState(null);
  prevData.current=data


  React.useEffect(() => {
    const diff = findListDiffIndex(prevData.current || [], data || [], getKey);
    if (diff?.index !== undefined) {
      setDiffItem(data[diff.index]);
    }
  }, [data,getKey]);

  return [diffItem];
}
