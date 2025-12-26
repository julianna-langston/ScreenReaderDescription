import { cleanup, fireEvent, render } from "@testing-library/react";
import App from "../src/App";
import { ScriptInfo } from "../src/types";
import { mergeDeep, LocalStorageMock } from "../src/utils";

global.localStorage = new LocalStorageMock();

beforeAll(() => {
  HTMLDialogElement.prototype.show = jest.fn(function mock(
    this: HTMLDialogElement
  ) {
    this.open = true;
  });
  
  HTMLDialogElement.prototype.showModal = jest.fn(function mock(
    this: HTMLDialogElement
  ) {
    this.open = true;
    this.addEventListener("blur", () => {
        this.close();
    });
  });
  
  HTMLDialogElement.prototype.close = jest.fn(function mock(
    this: HTMLDialogElement
  ) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  });

  global.confirm = () => true;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const doExportJson = (container: HTMLElement) => {
  const exportButton = container.querySelector("#export") as HTMLButtonElement;
  const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
  fireEvent.dragStart(exportButton, {
    dataTransfer: {
      setData: onDragStartMock,
      dropEffect: "",
    },
  });

  expect(onDragStartMock.mock.calls).toHaveLength(1);
  const [receivedDataType, receivedJsonString] = onDragStartMock.mock.calls[0];
  expect(receivedDataType).toBe("text/plain");

  const json: ScriptInfo = JSON.parse(receivedJsonString);

  return json;
}

describe("Track CRUD", () => {
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
        value: "00:03",
      },
    });
    fireEvent.change(textElem, {
      target: {
        value: "test",
      },
    });
  
    fireEvent.click(submitButtonElem);
  
    // Confirm element updated after change event
    expect(timestampElem).toHaveProperty("value", "00:03");
    expect(textElem).toHaveProperty("value", "");

    // Confirm table displays updates
    expect(table?.querySelectorAll("tr")).toHaveLength(1);
    expect(table?.querySelector("tr:first-child td")?.textContent).toBe("00:03");
    expect(
      table?.querySelector("tr:first-child td:last-child")?.textContent
    ).toBe("test");
  
    // Confirm updates saved to local storage
    expect(localStorage.getItem("saved-tracks")).toBe(
      JSON.stringify([
        {
          text: "test",
          timestamp: 3,
        },
      ])
    );

    // Confirm updates reflected in exports
    const json = doExportJson(container);4
    expect(json.scripts[0].tracks).toEqual([{
      text: "test",
      timestamp: 3
    }])
  });

  it("Edit track", () => {
    const savedTracks = JSON.stringify([
      {
        timestamp: 3,
        text: "Test",
      },
    ]);
    localStorage.setItem("saved-tracks", savedTracks);
    const { container, getByText } = render(<App />);
  
    const timestampElem: HTMLInputElement =
      container.querySelector("#track-timestamp")!;
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
        value: "00:04",
      },
    });
    expect(timestampElem.value).toBe("00:04");
    fireEvent.change(textElem, {
      target: {
        value: "My Test",
      },
    });
    expect(textElem.value).toBe("My Test");
    fireEvent.click(submitButtonElem);
  
    // Confirm updates
    expect(timestampElem.value).toBe("00:04");
    expect(textElem.value).toBe("");
    expect(table.querySelectorAll("tr")).toHaveLength(1);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:04My Test");
    expect(localStorage.getItem("saved-tracks")).toBe(
      JSON.stringify([
        {
          text: "My Test",
          timestamp: 4,
        },
      ])
    );

    const json = doExportJson(container);
    expect(json.scripts[0].tracks).toEqual([
      {
        text: "My Test",
        timestamp: 4,
      },
    ])
  });
  it("Delete track", () => {
    const savedTracks = JSON.stringify([
      {
        timestamp: 3,
        text: "Test",
      },
    ]);
    localStorage.setItem("saved-tracks", savedTracks);
    const { container, queryByText } = render(<App />);
  
    const timestampElem: HTMLInputElement =
      container.querySelector("#track-timestamp")!;
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
    expect(localStorage.getItem("saved-tracks")).toBe("[]");
    
    const json = doExportJson(container);
    expect(json.scripts[0].tracks).toEqual([])
  });
  it("Cancel edit track", () => {
    const savedTracks = JSON.stringify([
      {
        timestamp: 3,
        text: "Test",
      },
    ]);
    localStorage.setItem("saved-tracks", savedTracks);
    const { container, queryByText } = render(<App />);
  
    const timestampElem: HTMLInputElement =
      container.querySelector("#track-timestamp")!;
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
        value: "00:04",
      },
    });
    expect(timestampElem.value).toBe("00:04");
    fireEvent.change(textElem, {
      target: {
        value: "My Test",
      },
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

  
  it("Timestamp 11:23.6", () => {
    const { container, getByText } = render(<App />);
  
    const table = container.querySelector("tbody");
  
    expect(table?.querySelectorAll("tr")).toHaveLength(0);
    expect(localStorage.getItem("saved-tracks")).toBeNull();
  
    const timestampElem = container.querySelector("#track-timestamp")!;
    const textElem = container.querySelector("#track-text")!;
    const submitButtonElem = getByText("Submit") as HTMLButtonElement;
  
    fireEvent.change(timestampElem, {
      target: {
        value: "11:23.6",
      },
    });
    fireEvent.change(textElem, {
      target: {
        value: "test",
      },
    });
  
    fireEvent.click(submitButtonElem);
  
    // Confirm element updated after change event
    expect(timestampElem).toHaveProperty("value", "11:23.6");

    // Confirm table displays updates
    expect(table?.querySelectorAll("tr")).toHaveLength(1);
    expect(table?.querySelector("tr:first-child td")?.textContent).toBe("11:23.6");
  });

})
describe("Get info from localStorage", () => {
  it.each([
    [
      ["URL", "URL", "saved-url"],
      ["Type", "music video", "saved-type"],
      ["Title", "My Title", "saved-title"],
      ["Series Title", "My Series Title", "saved-seriesTitle"],
      ["Season", "1", "saved-season"],
      ["Episode", "4", "saved-episode"],
    ],
  ])("Get %s", ([label, savedValue, key]) => {
    localStorage.setItem(key, savedValue);
    const { getByLabelText } = render(<App />);
    expect(
      (getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value
    ).toBe(savedValue);
  });

  it("Get Tracks", () => {
    const savedTracks = [
      {
        timestamp: 3,
        text: "Test",
      },
    ];
    localStorage.setItem("saved-tracks", JSON.stringify(savedTracks));
    const { container } = render(<App />);

    const table = container.querySelector("tbody");
    expect(table?.querySelectorAll("tr")).toHaveLength(1);
    expect(table?.querySelector("tr")?.textContent).toBe("00:03Test");
  });
  it("Author name", () => {
    localStorage.setItem("saved-author", "Jane Doe");
    const { container } = render(<App />);
  
    expect(localStorage.getItem("saved-author")).toBe("Jane Doe");
  
    const authorNameElem = container.querySelector("#author-name") as HTMLInputElement;
    expect(authorNameElem).toHaveProperty("value", "Jane Doe");
  });
});
it("Edit author name", () => {
  const savedTracks = JSON.stringify([
    {
      timestamp: 3,
      text: "Test",
    },
  ]);
  localStorage.setItem("saved-tracks", savedTracks);
  const { container } = render(<App />);

  expect(localStorage.getItem("saved-author")).toBeNull();

  const authorNameElem = container.querySelector("#author-name") as HTMLInputElement;
  fireEvent.change(authorNameElem, {
    target: {
      value: "John Doe"
    }
  });

  expect(authorNameElem).toHaveProperty("value", "John Doe");
  expect(localStorage.getItem("saved-author")).toBe("John Doe");

  const json = doExportJson(container);
  expect(json.scripts[0].author).toEqual("John Doe");
});

it("Test drag effect", () => {
  const expectedJson = {
    source: {
      url: "https://www.hidive.com/video/576138?seasonId=20456",
      domain: "hidive",
      id: "576138",
    },
    metadata: {
      type: "television episode",
      title: "Aurpin is Here!",
      seriesTitle: "Shirobako",
      season: 1,
      episode: 2,
    },
    scripts: [
      {
        language: "en-US",
        author: "",
        tracks: [
          {
            timestamp: 3,
            text: "Test",
          },
        ],
      },
    ],
  };
  localStorage.setItem(
    "saved-tracks",
    JSON.stringify(expectedJson.scripts[0].tracks)
  );
  localStorage.setItem("saved-url", expectedJson.source.url);
  localStorage.setItem("saved-type", expectedJson.metadata.type);
  localStorage.setItem("saved-title", expectedJson.metadata.title);
  localStorage.setItem("saved-seriesTitle", expectedJson.metadata.seriesTitle);
  localStorage.setItem("saved-season", String(expectedJson.metadata.season));
  localStorage.setItem("saved-episode", String(expectedJson.metadata.episode));
  const { container } = render(<App />);

  const json = doExportJson(container);
  expect(json).toEqual(expectedJson);
});

const defaultExport = {
  source: {
    url: "",
    domain: "youtube",
    id: "",
  },
  metadata: {
    type: "other",
    title: "",
  },
  scripts: [
    {
      language: "en-US",
      author: "",
      tracks: [],
    },
  ],
};

describe("Test editing metadata", () => {
  it.skip("Type", () => {
    const key = "saved-type";
    const label = "Type";
    const value = "movie";
    const defaultValue = "other";
    const expectCallback = (json: ScriptInfo) => {
      expect(json.metadata).toContain({
        type: "movie",
      });
    };

    expect(localStorage.getItem(key)).toBeNull();
    const { getByText, getByLabelText } = render(<App />);

    const elem = getByLabelText(label) as HTMLInputElement | HTMLSelectElement;

    // Confirm default value
    expect(elem.value).toBe(defaultValue);

    // Change value
    fireEvent.change(elem, { target: { value } });
    expect(elem.value).toBe(value);

    // Confirm changed values are saved to localStorage
    expect(localStorage.getItem(key)).toBe(value);

    // Confirm that changed values are reflected in the drag effect
    const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
    const exportButton = getByText("Export");
    fireEvent.dragStart(exportButton, {
      dataTransfer: {
        setData: onDragStartMock,
        dropEffect: "",
      },
    });

    expect(onDragStartMock.mock.calls).toHaveLength(1);
    const [receivedDataType, receivedJsonString] =
      onDragStartMock.mock.calls[0];
    expect(receivedDataType).toBe("text/plain");
    const json: ScriptInfo = JSON.parse(receivedJsonString);
    expectCallback(json);
  });
  it.each([
    [
      [
        "Title",
        "My New Title",
        "saved-title",
        "false",
        JSON.stringify({
          metadata: {
            title: "My New Title",
            creator: "",
          },
        }),
      ],
      [
        "Season",
        "5",
        "saved-season",
        "true",
        JSON.stringify({
          metadata: {
            type: "television episode",
            seriesTitle: "",
            season: 5,
            episode: 0,
          },
        }),
      ],
      [
        "Episode",
        "7",
        "saved-episode",
        "true",
        JSON.stringify({
          metadata: {
            type: "television episode",
            seriesTitle: "",
            season: 0,
            episode: 7,
          },
        }),
      ],
      [
        "URL",
        "https://www.youtube.com/watch?v=xyz",
        "saved-url",
        "false",
        JSON.stringify({
          source: {
            url: "https://www.youtube.com/watch?v=xyz",
            domain: "youtube",
            id: "xyz",
          },
          metadata: {
            creator: "",
          },
        }),
      ],
      [
        "Series Title",
        "My New Series Title",
        "saved-seriesTitle",
        "true",
        JSON.stringify({
          metadata: {
            type: "television episode",
            seriesTitle: "My New Series Title",
            season: 0,
            episode: 0,
          },
        }),
      ],
      [
        "Crator",
        "My Name",
        "saved-creator",
        "false",
        JSON.stringify({
          metadata: {
            creator: "My Name",
          },
        }),
      ],
    ],
  ])("%s", ([label, value, key, tv, expected]) => {
    const shouldShowTV = tv === "true";

    expect(localStorage.getItem(key)).toBeNull();
    if (shouldShowTV) {
      localStorage.setItem("saved-type", "television episode");
    }
    const { getByText, getByLabelText } = render(<App />);

    const elem = getByLabelText(label) as HTMLInputElement | HTMLSelectElement;

    // Change value
    fireEvent.change(elem, { target: { value } });

    // Confirm changed values are saved to localStorage
    expect(localStorage.getItem(key)).toBe(value);

    // Confirm that changed values are reflected in the drag effect
    const onDragStartMock = jest.fn<unknown, string[], string>(() => {});
    const exportButton = getByText("Export");
    fireEvent.dragStart(exportButton, {
      dataTransfer: {
        setData: onDragStartMock,
        dropEffect: "",
      },
    });

    expect(onDragStartMock.mock.calls).toHaveLength(1);
    const [receivedDataType, receivedJsonString] =
      onDragStartMock.mock.calls[0];
    expect(receivedDataType).toBe("text/plain");
    const json: ScriptInfo = JSON.parse(receivedJsonString);
    expect(json).toEqual(mergeDeep(defaultExport, JSON.parse(expected)));
  });
});

it.skip("Season checkbox and input behavior", () => {
  localStorage.setItem("saved-type", "television episode");
  const { container } = render(<App />);

  // Initially, checkbox should be checked and season input should show "0"
  const seasonCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  const seasonInput = container.querySelector('input[type="number"]') as HTMLInputElement;
  
  expect(seasonCheckbox).toHaveProperty("checked", true);
  expect(seasonInput).toHaveProperty("value", "0");

  // Uncheck the checkbox
  fireEvent.click(seasonCheckbox);
  expect(seasonCheckbox).toHaveProperty("checked", false);
  
  // Season input should still be there but checkbox controls visibility
  expect(seasonInput).toHaveProperty("value", "0");

  // Check the checkbox again
  fireEvent.click(seasonCheckbox);
  expect(seasonCheckbox).toHaveProperty("checked", true);

  // Change the season value
  fireEvent.change(seasonInput, { target: { value: "3" } });
  expect(seasonInput).toHaveProperty("value", "3");
  expect(localStorage.getItem("saved-season")).toBe("3");
  expect(localStorage.getItem("saved-seasonCheckbox")).toBe("true");
});

it.todo("Upload button - drop");
it.todo("Upload button - upload file");

describe("Tracks are sorted", () => {
  it("Adding track in middle", () => {
    const savedTracks = JSON.stringify([
      {
        timestamp: 3,
        text: "Test",
      },
      {
        timestamp: 8,
        text: "Test 2",
      },
    ]);
    localStorage.setItem("saved-tracks", savedTracks);
    const { container, getByText } = render(<App />);

    const timestampElem: HTMLInputElement =
      container.querySelector("#track-timestamp")!;
    const textElem: HTMLInputElement = container.querySelector("#track-text")!;
    const submitButtonElem = getByText("Submit")! as HTMLButtonElement;

    const table = container.querySelector("tbody")!;
    expect(table.querySelectorAll("tr")).toHaveLength(2);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");
    expect(table.querySelectorAll("tr")[1].textContent).toBe("00:08Test 2Push");

    // Change values
    fireEvent.change(timestampElem, {
      target: {
        value: "00:06",
      },
    });
    fireEvent.change(textElem, {
      target: {
        value: "Test 3",
      },
    });
    fireEvent.click(submitButtonElem);

    // Confirm updates
    expect(table.querySelectorAll("tr")).toHaveLength(3);
    expect(table.querySelectorAll("tr")[0].textContent).toBe("00:03Test");
    expect(table.querySelectorAll("tr")[1].textContent).toBe("00:06Test 3Push");
    expect(table.querySelectorAll("tr")[2].textContent).toBe("00:08Test 2Push");
    expect(localStorage.getItem("saved-tracks")).toBe(
      JSON.stringify([
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
        },
      ])
    );
  });
  it.todo("Adding track at end");
  it.todo("Editing track's timestamp to move its index");
});

it.skip("Reset", () => {
  const expectedJson = {
    source: {
      url: "https://www.hidive.com/video/576138?seasonId=20456",
      domain: "hidive",
      id: "576138",
    },
    metadata: {
      type: "television episode",
      title: "Aurpin is Here!",
      seriesTitle: "Shirobako",
      season: 1,
      episode: 2,
    },
    scripts: [
      {
        language: "en-US",
        author: "",
        tracks: [
          {
            timestamp: 3,
            text: "Test",
          },
        ],
      },
    ],
  };
  localStorage.setItem(
    "saved-tracks",
    JSON.stringify(expectedJson.scripts[0].tracks)
  );
  localStorage.setItem("saved-url", expectedJson.source.url);
  localStorage.setItem("saved-type", expectedJson.metadata.type);
  localStorage.setItem("saved-title", expectedJson.metadata.title);
  localStorage.setItem("saved-seriesTitle", expectedJson.metadata.seriesTitle);
  localStorage.setItem("saved-season", String(expectedJson.metadata.season));
  localStorage.setItem("saved-seasonCheckbox", "true");
  localStorage.setItem("saved-episode", String(expectedJson.metadata.episode));
  const { container, getByText, getByLabelText } = render(<App />);

  // Expect display content from loaded values
  expect(getByLabelText("Type")).toHaveProperty("value", expectedJson.metadata.type);
  expect(getByLabelText("URL")).toHaveProperty("value", expectedJson.source.url);
  expect(getByLabelText("Title")).toHaveProperty("value", expectedJson.metadata.title);
  expect(getByLabelText("Series Title")).toHaveProperty("value", expectedJson.metadata.seriesTitle);
  expect(getByLabelText("Episode")).toHaveProperty("value", String(expectedJson.metadata.episode));
  
  // Expect exported content
  expect(doExportJson(container)).toEqual(expectedJson);
  
  // Click reset button
  fireEvent.click(getByText("Reset"));
  
  // Expect display content from reset values
  expect(getByLabelText("Type")).toHaveProperty("value", expectedJson.metadata.type);
  expect(getByLabelText("URL")).toHaveProperty("value", "");
  expect(getByLabelText("Title")).toHaveProperty("value", "");
  expect(getByLabelText("Series Title")).toHaveProperty("value", "");
  expect(getByLabelText("Episode")).toHaveProperty("value", "0");
  
  // Expect exported content
  expect(doExportJson(container)).toEqual({
    ...defaultExport,
    metadata: {
      episode: 0,
      season: 0,
      seriesTitle: "",
      title: "",
      type: "television episode"
    }
  });

  // Expect saved value
  expect(localStorage.getItem("saved-type")).not.toBeNull();
  expect(localStorage.getItem("saved-url")).toBeNull();
  expect(localStorage.getItem("saved-title")).toBeNull();
  expect(localStorage.getItem("saved-seriesTitle")).toBeNull();
  expect(localStorage.getItem("saved-season")).toBeNull();
  expect(localStorage.getItem("saved-episode")).toBeNull();
});

describe("Splicer", () => {
  it("Open and close dialog", () => {
    const { container, getByText } = render(<App />);

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.open).toBeFalsy();
    
    const spliceBtn = getByText("Splice");
    fireEvent.click(spliceBtn);
    
    expect(dialog?.open).toBeTruthy();
    
    fireEvent.click(getByText("Close"));
    expect(dialog?.open).toBeFalsy();
  });
  it.todo("You can open Splicer again after clicking 'Close'")
  it.todo("You can open Splicer again after ESCing out")
  it("Dropping data causes table to update", () => {
    const {container, getByText} = render(<App />);
    fireEvent.click(getByText("Splice"));
    const dialog = container.querySelector("dialog");

    expect(dialog?.querySelectorAll("tbody tr")).toHaveLength(0);

    const fileInput = dialog?.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.drop(fileInput, {
      dataTransfer: {
        getData: () => JSON.stringify({
            ...defaultExport,
            scripts: [{
              ...defaultExport.scripts[0],
              tracks: [
                {
                  timestamp: 3,
                  text: "Test"
                }
              ]
            }]
          })
      }
    })

    expect(dialog?.querySelectorAll("tbody tr")).toHaveLength(1);
  });
  it("Add track in place to empty tracks", () => {
    const {container, getByText} = render(<App />);

    const dialog = container.querySelector("dialog");
    const tableElem = container.querySelector("table");
    expect(tableElem?.querySelectorAll("tbody tr")).toHaveLength(0);

    fireEvent.click(getByText("Splice"));

    // Import data
    const fileInput = dialog?.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.drop(fileInput, {
      dataTransfer: {
        getData: () => JSON.stringify({
            ...defaultExport,
            scripts: [{
              ...defaultExport.scripts[0],
              tracks: [
                {
                  timestamp: 3,
                  text: "Test"
                }
              ]
            }]
          })
      }
    })

    expect(dialog?.querySelector("input[type='radio']:checked")).toHaveProperty("value", "adjust")
    fireEvent.click(dialog?.querySelector("input[type='radio'][value='preserve']") as HTMLInputElement)
    expect(dialog?.querySelector("input[type='radio']:checked")).toHaveProperty("value", "preserve")

    expect(dialog?.querySelectorAll("input[type='checkbox']")).toHaveLength(1)
    // 0 checkboxes are checked
    expect(dialog?.querySelectorAll("input[type='checkbox']:checked")).toHaveLength(0)

    // Check first checkbox
    const checkbox = dialog?.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(checkbox).toHaveProperty("checked", false);
    fireEvent.click(checkbox);
    expect(checkbox).toHaveProperty("checked", true);

    // 1 checkboxes are checked
    expect(dialog?.querySelectorAll("input[type='checkbox']:checked")).toHaveLength(1)

    fireEvent.click(getByText("Splice in 1 tracks"));

    expect(dialog?.open).toBeFalsy();

    expect(tableElem?.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(tableElem?.querySelector("tbody tr")?.textContent).toBe("00:03Test");
  });
  
  it.todo("add 1 track that needs to adjust forward");
  it.todo("add 1 track that needs to adjust backwards");
  it.todo("add several tracks that need to adjust");
});