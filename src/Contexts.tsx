import { Accessor, children, createContext, JSX, useContext } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

export interface MusicInfo {
    picture?: any;
    title?: string;
    artist?: string[];
    album?: string;
}

export interface SideBarItem {
    name: string;
    noShadow?: boolean;
    el: JSX.Element;
}

export interface SideBarSettings {
    items: Accessor<SideBarItem>[];
    withLogo: boolean;
}

export interface AppState {
    musicInfo: Store<MusicInfo>;
    setMusicInfo: SetStoreFunction<MusicInfo>;

    sideBarSettings: Store<SideBarSettings>;
    setSideBarSettings: SetStoreFunction<SideBarSettings>;
}

const DEFAULT_APP_STATE = (() => {
    const [musicInfo, setMusicInfo] = createStore<MusicInfo>();
    const [sideBarSettings, setSideBarSettings] = createStore<SideBarSettings>({ items: [], withLogo: true });
    const appState = {
        musicInfo,
        setMusicInfo,
        sideBarSettings,
        setSideBarSettings,
    };

    return appState;
})();

export const AppContext = createContext<AppState>(DEFAULT_APP_STATE, { name: "AppContext" });
export const useApp = () => useContext(AppContext);
export const AppContextProvider = (props: any) => {
    const appState = DEFAULT_APP_STATE;
    const currentChildren = children(props.children);

    return <AppContext.Provider value={appState}>{currentChildren()}</AppContext.Provider>
};