export const initConsoleWarning = () => {
    // 1. Clear any existing logs
    console.clear();

    const warningTitleCSS = 'color: red; font-size: 60px; font-weight: bold; -webkit-text-stroke: 1px black;';
    const warningDescCSS = 'font-size: 18px;';

    // 2. Print the warning using the original console.log (before disabling)
    console.log('%cStop!', warningTitleCSS);
    console.log(
        '%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or "hack" someone\'s account, it is a scam and will give them access to your CGU Connect account.',
        warningDescCSS
    );

    // 3. Disable console.log and other info methods to prevent data leakage
    // We keep console.error and console.warn for critical issues
    const noop = () => { };

    // Create a strict mode that prevents re-enabling if possible, or just standard override
    Object.defineProperties(window.console, {
        log: { value: noop, writable: false },
        info: { value: noop, writable: false },
        table: { value: noop, writable: false },
        debug: { value: noop, writable: false },
        // trace: { value: noop, writable: false }, // Optional: hide traces
    });
};
