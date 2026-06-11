import React from 'react';

interface ButtonProps {
  active: boolean;
  size: 'sm' | 'lg';
  extra: string;
}

// tailwind-unsafe-class-concat: binary concat — was already caught
export function ButtonConcat({ active, extra }: ButtonProps) {
  return <button className={'px-4 ' + extra}>click</button>;
}

// tailwind-unsafe-class-concat: template literal with ternary — now caught
export function ButtonTemplateTernary({ active }: ButtonProps) {
  return <button className={`px-4 ${active ? 'bg-blue-500' : 'bg-gray-200'}`}>click</button>;
}

// tailwind-unsafe-class-concat: template literal with variable — now caught
export function ButtonTemplateVar({ active, extra }: ButtonProps) {
  return <button className={`flex ${extra}`}>click</button>;
}

// tailwind-unsafe-class-concat: template literal building partial class name — now caught
export function ButtonTemplatePartial({ size }: ButtonProps) {
  return <button className={`text-${size}`}>click</button>;
}

// safe: static className — should NOT fire
export function ButtonStatic() {
  return <button className="px-4 bg-blue-500 flex">click</button>;
}

// safe: clsx usage — should NOT fire
export function ButtonClsx({ active }: ButtonProps) {
  return <button className={`${active ? 'bg-blue-500' : ''}`}>click</button>;
}
