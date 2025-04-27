import { createSignal, createEffect } from 'solid-js';
import { CSSProperties } from 'react';

export const ThemeToggle = () => {
  const [theme, setTheme] = createSignal(localStorage.getItem('theme') || 'dark');

  createEffect(() => {
    document.documentElement.setAttribute('data-theme', theme());
    localStorage.setItem('theme', theme());
  });

  const toggleTheme = () => {
    setTheme(theme() === 'dark' ? 'light' : 'dark');
  };

  const [buttonStyle, setButtonStyle] = createSignal({
    position: 'relative',
    width: '40px',
    height: '40px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'border-radius': '50%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '8px',
    color: theme() === 'dark' ? '#fff' : '#000',
    transition: 'background-color 0.3s',
  });

  createEffect(() => {
    setButtonStyle({
      position: 'relative',
      width: '40px',
      height: '40px',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'border-radius': '50%',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      padding: '8px',
      color: theme() === 'dark' ? '#fff' : '#000',
      transition: 'background-color 0.3s',
    });
  });

  interface IconStyle {
    position: 'absolute' | 'relative' | 'fixed' | 'static' | 'sticky';
    opacity: string;
    transform: string;
    transition: string;
  }

  const iconStyle = (isVisible: boolean) => ({
    position: 'absolute',
    opacity: isVisible ? '1' : '0',
    transform: `rotate(${isVisible ? '0deg' : '90deg'}) scale(${isVisible ? '1' : '0'})`,
    transition: 'all 0.5s',
  });

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} mode`}
      style={buttonStyle()}
    >
      <span style={iconStyle(theme() === 'dark')}>🌙</span>
      <span style={iconStyle(theme() === 'light')}>☀️</span>
    </button>
  );
};

export default ThemeToggle;
