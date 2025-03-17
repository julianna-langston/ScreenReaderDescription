import {cleanup, fireEvent, render} from "@testing-library/react";
import App from "../src/App";
import { ScriptInfo } from "../src/types";
import { mergeDeep } from "../src/utils";

afterEach(() => {
    cleanup();
    localStorage.clear();
});

class LocalStorageMock {
    private store: Record<string, string>;
    constructor() {
        this.store = {};
    }
    clear() {
        this.store = {};
    }
    getItem(key: string) {
        return this.store[key] || null;
    }
    setItem(key: string, value: string){
        this.store[key] = value;
    }
    removeItem(key: string) {
        delete this.store[key];
    }
    get length() {
        return Object.keys(this.store).length;
    }
    key(index: number) {
        return Object.keys(this.store)[index];
    }
}
global.localStorage = new LocalStorageMock;

it("Add a track line", () => {
    const { container, getByText } = render(<App />);

    const table = container.querySelector("tbody");
    
    expect(table?.querySelectorAll("tr")).toHaveLength(0);
    expect(localStorage.getItem("saved-tracks")).toBeNull();

    const timestampElem = container.querySelector("#track-timestamp")!;
    const textElem = container.querySelector("#track-text")!;
    const submitButtonElem = getByText("Submit") as HTMLButtonElement;

    fireEvent.change(timestampElem, {
        target: {
            value: "00:03"
        }
    });
    fireEvent.change(textElem, {
        target: {
            value: "test"
        }
    });

    fireEvent.click(submitButtonElem);

    expect(table?.querySelectorAll("tr")).toHaveLength(1);
    expect(table?.querySelector("tr:first-child td")?.textContent).toBe("00:03");
    expect(table?.querySelector("tr:first-child td:last-child")?.textContent).toBe("test");

    expect(timestampElem).toHaveProperty("value", "00:03");
    expect(textElem).toHaveProperty("value", "");
    expect(localStorage.getItem("saved-tracks")).toBe(JSON.stringify([
        {
            text: "test",
            timestamp: 3
        }
    ]));
});

describe("Get info from localStorage", () => {
    it.each([[
        ["URL", "URL", "saved-url"],
        ["Type", "music video", "saved-type"],
        ["Title", "My Title", "saved-title"],
        ["Series Title", "My Series Title", "saved-seriesTitle"],
        ["Season", "1", "saved-season"],
        ["Episode", "4", "saved-episode"]
    ]])("Get %s", ([label, savedValue, key]) => {
        localStorage.setItem(key, savedValue);
        const { getByLabelText } = render(<App />);
        expect((getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value).toBe(savedValue);
        
    })

    it("Get Tracks", () => {
        const savedTracks = [{
            timestamp: 3,
            text: "Test"
        }];
        localStorage.setItem("saved-tracks", JSON.stringify(savedTracks));
        const {container} = render(<App />);
        
        const table = container.querySelector("tbody");
        expect(table?.querySelectorAll("tr")).toHaveLength(1);
        expect(table?.querySelector("tr")?.textContent).toBe("00:03Test");
    });
});

it("Edit track", () => {
    const savedTracks = JSON.stringify([{
        timestamp: 3,
        text: "Test"
    }]);
    localStorage.setItem("saved-tracks", savedTracks);
    const {container, getByText} = render(<App />);

    const timestampElem: HTMLInputElement = container.querySelector("#track-timestamp")!;
    const textElem: HTMLInputElement = container.querySelector("#track-text")!;
    const submitButtonElem = getByText("Submit")! as HTMLButtonElement;

    const table = container.querySelector("tbody")!;
    expect(table.querySelectorAll("tr")).toHaveLength(1);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");

    // Confirm that the text and timestamp are empty
    expect(timestampElem.value).toBe("00:00");
    expect(textElem.value).toBe("");

    // Click the first timestamp
    const timestampButton = table?.querySelector("tr button")!;
    fireEvent.click(timestampButton);

    // Info should've updated
    expect(timestampElem.value).toBe("00:03");
    expect(textElem.value).toBe("Test");

    // Change values
    fireEvent.change(timestampElem, {
        target: {
            value: "00:04"
        }
    });
    expect(timestampElem.value).toBe("00:04");
    fireEvent.change(textElem, {
        target: {
            value: "My Test"
        }
    });
    expect(textElem.value).toBe("My Test");
    fireEvent.click(submitButtonElem);
    
    // Confirm updates
    expect(timestampElem.value).toBe("00:04");
    expect(textElem.value).toBe("");
    expect(table.querySelectorAll("tr")).toHaveLength(1);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:04My Test");
    expect(localStorage.getItem("saved-tracks")).toBe(JSON.stringify([{
        text: "My Test",
        timestamp: 4
    }]));
});
it("Delete track", () => {
    const savedTracks = JSON.stringify([{
        timestamp: 3,
        text: "Test"
    }]);
    localStorage.setItem("saved-tracks", savedTracks);
    const {container, queryByText} = render(<App />);

    const timestampElem: HTMLInputElement = container.querySelector("#track-timestamp")!;
    const textElem: HTMLInputElement = container.querySelector("#track-text")!;
    const table = container.querySelector("tbody");
    expect(table?.querySelectorAll("tr")).toHaveLength(1);

    // Confirm that the text and timestamp are empty
    expect(timestampElem.value).toBe("00:00");
    expect(textElem.value).toBe("");
    expect(queryByText("Delete")).toBeNull();

    // Click the first timestamp
    const timestampButton = table?.querySelector("tr button")!;
    fireEvent.click(timestampButton);

    // Info should've updated
    expect(timestampElem.value).toBe("00:03");
    expect(textElem.value).toBe("Test");
    expect(queryByText("Delete")).not.toBeNull();

    // Click Delete button
    fireEvent.click(queryByText("Delete")!);

    expect(table?.querySelectorAll("tr")).toHaveLength(0);
});
it("Cancel edit track", () => {
    const savedTracks = JSON.stringify([{
        timestamp: 3,
        text: "Test"
    }]);
    localStorage.setItem("saved-tracks", savedTracks);
    const {container, queryByText} = render(<App />);

    const timestampElem: HTMLInputElement = container.querySelector("#track-timestamp")!;
    const textElem: HTMLInputElement = container.querySelector("#track-text")!;

    const table = container.querySelector("tbody")!;
    expect(table.querySelectorAll("tr")).toHaveLength(1);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");

    // Confirm that the text and timestamp are empty
    expect(timestampElem.value).toBe("00:00");
    expect(textElem.value).toBe("");

    expect(queryByText("Cancel")).toBeNull();

    // Click the first timestamp
    const timestampButton = table?.querySelector("tr button")!;
    fireEvent.click(timestampButton);

    // Info should've updated
    expect(timestampElem.value).toBe("00:03");
    expect(textElem.value).toBe("Test");

    // Change values
    fireEvent.change(timestampElem, {
        target: {
            value: "00:04"
        }
    });
    expect(timestampElem.value).toBe("00:04");
    fireEvent.change(textElem, {
        target: {
            value: "My Test"
        }
    });
    expect(textElem.value).toBe("My Test");

    expect(queryByText("Cancel")).not.toBeNull();
    fireEvent.click(queryByText("Cancel")!);
    
    // Confirm updates
    expect(timestampElem.value).toBe("00:04");
    expect(textElem.value).toBe("");
    expect(table.querySelectorAll("tr")).toHaveLength(1);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");
});

it("Test drag effect", () => {
    const expectedJson = {
      source: {
        url: "https://www.hidive.com/video/576138?seasonId=20456",
        domain: "hidive",
        id: "576138"
      },
      metadata: {
        type: "television episode",
        title: "Aurpin is Here!",
        seriesTitle: "Shirobako",
        season: 1,
        episode: 2
      },
      scripts: [{
        language: "en-US",
        author: "",
        tracks: [{
            timestamp: 3,
            text: "Test"
        }]
      }]
    };
    localStorage.setItem("saved-tracks", JSON.stringify(expectedJson.scripts[0].tracks));
    localStorage.setItem("saved-url", expectedJson.source.url);
    localStorage.setItem("saved-type", expectedJson.metadata.type);
    localStorage.setItem("saved-title", expectedJson.metadata.title);
    localStorage.setItem("saved-seriesTitle", expectedJson.metadata.seriesTitle);
    localStorage.setItem("saved-season", String(expectedJson.metadata.season));
    localStorage.setItem("saved-episode", String(expectedJson.metadata.episode));
    const {getByText} = render(<App />);

    const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
    const exportButton = getByText("Export");
    fireEvent.dragStart(exportButton, {
        dataTransfer: {
            setData: onDragStartMock,
            dropEffect: ""
        }
    });

    expect(onDragStartMock.mock.calls).toHaveLength(1);
    const [receivedDataType, receivedJsonString] = onDragStartMock.mock.calls[0];
    expect(receivedDataType).toBe("text/plain");
    const json: ScriptInfo = JSON.parse(receivedJsonString);
    expect(json).toEqual(expectedJson);
});

const defaultExport = {
    source: {
      url: "",
      domain: "youtube",
      id: ""
    },
    metadata: {
      type: "other",
      title: "",
    },
    scripts: [{
      language: "en-US",
      author: "",
      tracks: []
    }]
  };

describe("Test editing metadata", () => {
    it.skip("Type", () => {
        const key = "saved-type";
        const label = "Type";
        const value = "movie";
        const defaultValue = "other";
        const expectCallback = (json: ScriptInfo) => {
            expect(json.metadata).toContain({
                type: "movie"
            });
        }

        expect(localStorage.getItem(key)).toBeNull();
        const {getByText, getByLabelText} = render(<App />);

        const elem = getByLabelText(label) as HTMLInputElement | HTMLSelectElement;

        // Confirm default value
        expect(elem.value).toBe(defaultValue);

        // Change value
        fireEvent.change(elem, {target: {value}});
        expect(elem.value).toBe(value);

        // Confirm changed values are saved to localStorage
        expect(localStorage.getItem(key)).toBe(value)

        // Confirm that changed values are reflected in the drag effect
        const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
        const exportButton = getByText("Export");
        fireEvent.dragStart(exportButton, {
            dataTransfer: {
                setData: onDragStartMock,
                dropEffect: ""
            }
        });

        expect(onDragStartMock.mock.calls).toHaveLength(1);
        const [receivedDataType, receivedJsonString] = onDragStartMock.mock.calls[0];
        expect(receivedDataType).toBe("text/plain");
        const json: ScriptInfo = JSON.parse(receivedJsonString);
        expectCallback(json);
    });
    it.each([[
        ["Title", "My New Title", "saved-title", "false", JSON.stringify({
            metadata: {
                title: "My New Title",
                creator: "",
            }
        })],
        ["Season", "5", "saved-season", "true", JSON.stringify({
            metadata: {
                type: "television episode",
                seriesTitle: "",
                season: 5,
                episode: 0
            }
        })],
        ["Episode", "7", "saved-episode", "true", JSON.stringify({
            metadata: {
                type: "television episode",
                seriesTitle: "",
                season: 0,
                episode: 7
            }
        })],
        ["URL", "https://www.youtube.com/watch?v=xyz", "saved-url", "false", JSON.stringify({
            source: {
                url: "https://www.youtube.com/watch?v=xyz",
                domain: "youtube",
                id: "xyz"
            },
            metadata: {
                creator: ""
            }
        })],
        ["Series Title", "My New Series Title", "saved-seriesTitle", "true", JSON.stringify({
            metadata: {
                type: "television episode",
                seriesTitle: "My New Series Title",
                season: 0,
                episode: 0
            }
        })],
        ["Crator", "My Name", "saved-creator", "false", JSON.stringify({
            metadata: {
                creator: "My Name",
            }
        })],
    ]])("%s", ([label, value, key, tv, expected]) => {
        const shouldShowTV = tv === "true";

        expect(localStorage.getItem(key)).toBeNull();
        if(shouldShowTV){
            localStorage.setItem("saved-type", "television episode");
        }
        const {getByText, getByLabelText} = render(<App />);

        const elem = getByLabelText(label) as HTMLInputElement | HTMLSelectElement;

        // Change value
        fireEvent.change(elem, {target: {value}});

        // Confirm changed values are saved to localStorage
        expect(localStorage.getItem(key)).toBe(value)

        // Confirm that changed values are reflected in the drag effect
        const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
        const exportButton = getByText("Export");
        fireEvent.dragStart(exportButton, {
            dataTransfer: {
                setData: onDragStartMock,
                dropEffect: ""
            }
        });

        expect(onDragStartMock.mock.calls).toHaveLength(1);
        const [receivedDataType, receivedJsonString] = onDragStartMock.mock.calls[0];
        expect(receivedDataType).toBe("text/plain");
        const json: ScriptInfo = JSON.parse(receivedJsonString);
        expect(json).toEqual(mergeDeep(defaultExport, JSON.parse(expected)));
    });
});

it.todo("Upload button - drop")
it.todo("Upload button - upload file")
it.todo("Downloading with Export button");

describe("Tracks are sorted", () => {
    it("Adding track in middle", () => {
        const savedTracks = JSON.stringify([
            {
                timestamp: 3,
                text: "Test",
            },
            {
                timestamp: 8,
                text: "Test 2"
            }
        ]);
        localStorage.setItem("saved-tracks", savedTracks);
        const {container, getByText} = render(<App />);
    
        const timestampElem: HTMLInputElement = container.querySelector("#track-timestamp")!;
        const textElem: HTMLInputElement = container.querySelector("#track-text")!;
        const submitButtonElem = getByText("Submit")! as HTMLButtonElement;
    
        const table = container.querySelector("tbody")!;
        expect(table.querySelectorAll("tr")).toHaveLength(2);
        expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");
        expect(table.querySelectorAll("tr")[1].textContent).toBe("00:08Test 2");
    
        // Change values
        fireEvent.change(timestampElem, {
            target: {
                value: "00:06"
            }
        });
        fireEvent.change(textElem, {
            target: {
                value: "Test 3"
            }
        });
        fireEvent.click(submitButtonElem);
        
        // Confirm updates
        expect(table.querySelectorAll("tr")).toHaveLength(3);
        expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");
        expect(table.querySelectorAll("tr")[1].textContent).toBe("00:06Test 3");
        expect(table.querySelectorAll("tr")[2].textContent).toBe("00:08Test 2");
        expect(localStorage.getItem("saved-tracks")).toBe(JSON.stringify([
            {
                timestamp: 3,
                text: "Test",
            },
            {
                text: "Test 3",
                timestamp: 6,
            },
            {
                timestamp: 8,
                text: "Test 2",
            }
        ]));
    });
    it.todo("Adding track at end");
    it.todo("Editing track's timestamp to move its index")
});

it.todo("Reset");

it.todo("Splicer");