import { createEffect, createSignal, JSX, Show } from "solid-js";
import "./App.scss";
import { MusicBar } from "./top-widgets/MusicBar";
import { createStore } from "solid-js/store";
import { PlayPage } from "./top-widgets/PlayPage";
import { startTransitionSE } from "./SharedElement";


function App(): JSX.Element {
    const [musicTitle, _setMusicTitle] = createSignal("title");
    const [musicArtist, _setMusicArtist] = createSignal("artist");
    const [musicAlbum, _setMusicAlbum] = createSignal("album");

    const [globalStyle, _setGlobalStyle] = createStore({
        "--theme-color": "#c1d3fe",
        "--shadow-color": "#2f2f2f22",
        "--deep-shadow-color": "#2f2f2f55",
    });

    const [playPageShow, setPlayPageShow] = createSignal(false);
    let elPlayPage;

    createEffect(() => {
        if (elPlayPage) {
            (elPlayPage as HTMLElement).animate([
                {
                    "transform": "translateY(120%)",
                },
                {
                    "transform": "translateY(0%)",
                },
            ], {
                duration: 700,
                direction: playPageShow() ? "normal" : "reverse",
            });
        }
    });

    return (
        <main class="container" style={globalStyle}>
            <div class="content-container">
                <Show when={playPageShow()}>
                    <PlayPage
                        style={{
                            "z-index": "50",
                        }}
                        title={musicTitle()}
                        artist={musicArtist()}
                        album={musicAlbum()}
                        ref={elPlayPage}
                    />
                </Show>
            </div>
            <MusicBar
                title={musicTitle()}
                artist={musicArtist()}
                album={musicAlbum()}
                ref={(el: any) => {
                    el.style.flexBasis = "4rem";
                }}
                style={{
                    "z-index": "100",
                }}

                onSwitchPage={() => startTransitionSE(() => setPlayPageShow(val => !val))}
                showPicture={!playPageShow()}
                showInfoText={!playPageShow()}
            />
        </main>
    );
}

export default App;
