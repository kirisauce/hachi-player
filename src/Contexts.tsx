import { children, createContext, useContext } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

export interface MusicInfo {
    picture?: any;
    title?: string;
    artist?: string[];
    album?: string;
}

export interface AppState {
    musicInfo: Store<MusicInfo>;
    setMusicInfo: SetStoreFunction<MusicInfo>;
}

const DEFAULT_APP_STATE = (() => {
    const [musicInfo, setMusicInfo] = createStore<MusicInfo>();
    const appState = {
        musicInfo,
        setMusicInfo,
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