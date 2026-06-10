import React, { useState } from 'react';
import _ from 'lodash';
import { useEffect } from 'react';

export default function() {
  const [data, setData] = useState(fetchData());

  useEffect(async () => {
    const res = await fetch('/api');
    setData(res);
  }, [{ id: 1 }]);

  return (
    <ul>
      {data.map((item, i) => (
        <li onClick={() => console.log(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function fetchData() { return []; }
