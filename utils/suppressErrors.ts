// This file suppresses third-party tracking and platform errors
// It must be imported as early as possible

if (typeof window !== 'undefined') {
  const shouldSuppress = (message: string) => {
    return message.includes('base64') ||
      message.includes('chmln.js') ||
      message.includes('messo.min.js') ||
      message.includes('decoding value') ||
      message.includes('Contextify') ||
      message.includes('fetch.worker') ||
      message.includes('ERR_ABORTED 404') ||
      message.includes('Cannot read properties of undefined');
  };

  // Patch console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (shouldSuppress(message)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Patch console.warn
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (shouldSuppress(message)) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Catch window errors
  window.addEventListener('error', (e) => {
    const message = e.message || e.error?.toString() || '';
    if (shouldSuppress(message)) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  }, true);

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.toString() || '';
    if (shouldSuppress(message)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}
