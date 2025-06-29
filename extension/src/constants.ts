export const ccId = "screen-reader-descriptions-cc";
export const youtubeStyle = `
#${ccId} {
    background: var(--yt-spec-badge-chip-background);
    margin-top: 12px;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 1.4rem;
    line-height: 2rem;
    padding: 12px;
    border-radius: 12px;

    &:not(:has(:first-child)){
        display: none;
    }
}
`;
export const defaultStyle = `
#${ccId} div:not(:first-child){
    display: none;
}`;