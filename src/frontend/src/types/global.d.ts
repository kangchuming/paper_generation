declare global {
    interface MenuItem {
        key: string;
        label: string;
    }

    interface IInputVal {
        value: string;
        setValue: (newValue: string) => void;
    }

    interface IOutline {
        value: string;
        setOutline: (newOutline: string) => void;
    }
}

export { };