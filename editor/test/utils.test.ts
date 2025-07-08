import {convertTimestampToNumber, convertUrlToSource, displayTimestamp} from "../src/utils";

it("displayTimestamp", () => {
    expect(displayTimestamp(1)).toBe("00:01");
    expect(displayTimestamp(10)).toBe("00:10");
    expect(displayTimestamp(59)).toBe("00:59");
    expect(displayTimestamp(60)).toBe("01:00");
    expect(displayTimestamp(600)).toBe("10:00");
    expect(displayTimestamp(683)).toBe("11:23");
    expect(displayTimestamp(683.6)).toBe("11:23.6");
});

it("convertUrlToSource", () => {
    expect(convertUrlToSource("https://www.hidive.com/video/576138?seasonId=20456")).toEqual({
        url: "https://www.hidive.com/video/576138?seasonId=20456",
        id: "576138",
        domain: "hidive"
    });
    expect(convertUrlToSource("https://www.hidive.com/video/576138")).toEqual({
        url: "https://www.hidive.com/video/576138",
        id: "576138",
        domain: "hidive"
    });
    expect(convertUrlToSource("https://www.crunchyroll.com/watch/GYXJ4VVN6/turnabout-sisters--1st-trial")).toEqual({
        url: "https://www.crunchyroll.com/watch/GYXJ4VVN6/turnabout-sisters--1st-trial",
        id: "GYXJ4VVN6",
        domain: "crunchyroll"
    });
    expect(convertUrlToSource("https://www.crunchyroll.com/watch/GYXJ4VVN6/")).toEqual({
        url: "https://www.crunchyroll.com/watch/GYXJ4VVN6/",
        id: "GYXJ4VVN6",
        domain: "crunchyroll"
    });
    expect(convertUrlToSource("https://www.youtube.com/watch?v=cOQDsmEqVt8&ab_channel=littlemixVEVO")).toEqual({
        url: "https://www.youtube.com/watch?v=cOQDsmEqVt8&ab_channel=littlemixVEVO",
        id: "cOQDsmEqVt8",
        domain: "youtube"
    });

    expect(convertUrlToSource("http://www.google.com")).toEqual({
        url: "http://www.google.com",
        id: "",
        domain: "youtube"
    })
});

it("convertTimestampToNumber", () => {
    expect(convertTimestampToNumber("11:23")).toBe(683);
    expect(convertTimestampToNumber("11:23.1")).toBe(683.1);
    expect(convertTimestampToNumber("11:23.6")).toBe(683.6);
})