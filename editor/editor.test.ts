import { ScriptMetadata } from "../types";
import { Editor } from "./Editor";

test("Initializing", () => {
    const myEditor = new Editor("xyz");

    expect(myEditor.generateExport().source).toEqual({
        domain: "youtube",
        id: "xyz",
        url: "https://www.youtube.com/watch?v=xyz"
    });
});

test("Track CRUD", () => {
    const myEditor = new Editor("xyz");
    const onTrackUpdate = jest.fn();
    myEditor.onTrackUpdate(onTrackUpdate);

    myEditor.addTrack({
        timestamp: 3,
        text: "Test"
    });

    const result1 = [{
        timestamp: 3,
        text: "Test"
    }];
    expect(onTrackUpdate).toHaveBeenCalledTimes(1);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result1);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result1);

    myEditor.addTrack({
        timestamp: 4,
        text: "Test2"
    });

    const result2 = [{
        timestamp: 3,
        text: "Test"
    }, {
        timestamp: 4,
        text: "Test2"
    }];
    expect(onTrackUpdate).toHaveBeenCalledTimes(2);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result2);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result2);

    myEditor.modifyTrack(0, {
        timestamp: 3.5,
        text: "Test3"
    });
    
    const result3 = [{
        timestamp: 3.5,
        text: "Test3"
    }, {
        timestamp: 4,
        text: "Test2"
    }];
    expect(onTrackUpdate).toHaveBeenCalledTimes(3);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result3);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result3);

    myEditor.deleteTrack(0);

    const result4 = [{
        timestamp: 4,
        text: "Test2"
    }];
    expect(onTrackUpdate).toHaveBeenCalledTimes(4);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result4);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result4);
});

test("Sort added tracks", () => {
    const myEditor = new Editor("xyz");
    const onTrackUpdate = jest.fn();
    myEditor.onTrackUpdate(onTrackUpdate);

    myEditor.addTrack({
        timestamp: 3,
        text: "Test"
    });
    const result1 = [{
        timestamp: 3,
        text: "Test"
    }];
    expect(onTrackUpdate).toHaveBeenCalledTimes(1);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result1);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result1);

    myEditor.addTrack({
        timestamp: 2,
        text: "Test2"
    });
    const result2 = [
        {
            timestamp: 2,
            text: "Test2"
        },
        {
            timestamp: 3,
            text: "Test"
        }
    ];
    expect(onTrackUpdate).toHaveBeenCalledTimes(2);
    expect(onTrackUpdate).toHaveBeenLastCalledWith(result2);
    expect(myEditor.generateExport().scripts[0].tracks).toEqual(result2);

})

test("Update metadata: movie: happy path", () => {
    const myEditor = new Editor("xyz");
    
    expect(myEditor.generateExport().metadata).toEqual({
        type: "other",
        title: ""
    });

    myEditor.updateMetadata({type: "movie"});
    expect(myEditor.generateExport().metadata).toEqual({
        type: "movie",
        title: ""
    });

    myEditor.updateMetadata({title: "Test"});
    expect(myEditor.generateExport().metadata).toEqual({
        type: "movie",
        title: "Test"
    });
});

test("Update metadata: television episode", () => {
    const myEditor = new Editor("xyz");

    const meta: ScriptMetadata = {
        type: "television episode",
        seriesTitle: "Test",
        title: "Tester",
        season: 1,
        episode: 1
    }
    myEditor.updateMetadata(meta);

    expect(myEditor.generateExport().metadata).toEqual(meta)
});

test.todo("Initialize with starting values");

test.each([
    {seconds: 11, display: "0:11"},
    {seconds: 1, display: "0:01"},
    {seconds: 1.01, display: "0:01"},
    {seconds: 0.99999, display: "0:00"},
    {seconds: 61, display: "1:01"},
    {seconds: 83, display: "1:23"},
    {seconds: 119, display: "1:59"},
    {seconds: 120, display: "2:00"},
    {seconds: 599, display: "9:59"},
    {seconds: 600, display: "10:00"},
    {seconds: 754, display: "12:34"},
    {seconds: 3599, display: "59:59"},
    {seconds: 3600, display: "1:00:00"},
    {seconds: (3600*12) + (34*60)+56, display: "12:34:56"},
    {seconds: (3600*99) + (59*60)+59, display: "99:59:59"},
    {seconds: Infinity, display: "99:59:59"},
    {seconds: -1, display: "0:00"},
])("$display", ({seconds, display}) => {
    expect(Editor.displaySeconds(seconds)).toBe(display);
})