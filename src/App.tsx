import { createEffect, createSignal, JSX, Show } from "solid-js";
import "./App.scss";
import { MusicBar } from "./top-widgets/MusicBar";
import { createStore } from "solid-js/store";
import { PlayPage } from "./top-widgets/PlayPage";
import { SharedElement, startTransitionSE } from "./SharedElement";


function App(): JSX.Element {
    const [musicTitle, _setMusicTitle] = createSignal("title");
    const [musicArtist, _setMusicArtist] = createSignal("artist");
    const [musicAlbum, _setMusicAlbum] = createSignal("album");

    const [globalStyle, _setGlobalStyle] = createStore({
        "--theme-color": "#c1d3fe",
        "--shadow-color": "#2f2f2f22",
        "--deep-shadow-color": "#2f2f2f55",
    });

    createEffect(() => {
        Object.entries(globalStyle).forEach((entry) => {
            const [key, value] = entry;
            document.body.style.setProperty(key, value);
        })
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
        <main class="container">
            <div class="content-container">
                <Show when={playPageShow()}>
                    <PlayPage
                        title={musicTitle()}
                        artist={musicArtist()}
                        album={musicAlbum()}
                        ref={elPlayPage}
                    />
                </Show>
            </div>
            <SharedElement
                name="music-bar"
                fadeInAnimationProps={{ enable: false }}
                fadeOutAnimationProps={{ enable: false }}
            >
                <MusicBar
                    title={musicTitle()}
                    artist={musicArtist()}
                    album={musicAlbum()}
                    ref={(el: any) => {
                        el.style.flexBasis = "4rem";
                    }}

                    onSwitchPage={() => startTransitionSE(() => setPlayPageShow(val => !val))}
                    showPicture={!playPageShow()}
                    showInfoText={!playPageShow()}
                />
            </SharedElement>
        </main>
    );
}

export default App;
