import React from 'react';

export default function ProductCard({ product }) {
  return (
    <ul>
      {product.tags.map((tag, n) => (
        <li key={n}>{tag}</li>
      ))}
    </ul>
  );
}
