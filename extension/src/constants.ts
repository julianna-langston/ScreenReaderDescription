export const ccId = "screen-reader-descriptions-cc";
export const DOMAINS = ["crunchyroll", "youtube", "hidive", "emby"] as const;
export const youtubeStyle = `
#${ccId} {
    background: var(--yt-spec-badge-chip-background);
    margin-top: 12px;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 1.4rem;
    line-height: 2rem;
    padding: 12px;
    border-radius: 12px;

    div:not(:first-child){
        display: none;
    }
}
`;
export const defaultStyle = `
#${ccId} {
    position: absolute;
    bottom: -1000px
}
#${ccId} div:not(:first-child){
    display: none;
}
#ScreenReaderDescription-track-display #splice-button {
    display: none;
}
#ScreenReaderDescription-track-display[data-isEditing="true"] #splice-button {
    display: inline-block;
}
    `;