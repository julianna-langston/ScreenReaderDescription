# Editor: Test Driven Development

## Select video

### Directly via URL
1. spoof URL ?id=xyz
2. Wait for things to load (a few seconds)
3. Confirm everything's ready
    - YouTube shows the right thing
    - Metadata was grabbed

### Input field
1. Edit input field (and submit?)
2. Wait for things to load (a few seconds)
3. Confirm everything's ready
    - YouTube shows the right thing
    - Metadata was grabbed

## Adding a new track

## Editing a track's text
1. Play video from timestamp 1:23
2. Type "test" in textbox
3. Confirm
    - Video pauses
    - Timestamp block shows 1:23
    - "Test" appears in textbox

## Editing a track's time
1. Edit timestamp box
2. Confirm
    - Video jumps to updated timestamp time

Values:
- Invalid timestamps
- Timestamp further out than the video goes
- Existing timestamp
- Close to existing timestamp

### Time displays
Values
- 0:01
- 0:11
- 1:01
- 1:23
- 1:59
- 2:00
- 9:59
- 10:00
- 12:34
- 59:59
- 1:00:00
- 1:23:45
- 12:34:56
- 99:99:99

### Jump time back by seconds with UI

1. Press the Jump Back button
2. Confirm
    - Video jumps to edited point and does not play
    - Timestamp updated in the textbox
    - Timestamp updated in the transcript
    - On export, the updated timestamp is present

Ditto for Jump Forward button

### Edit time text

1. Edit the timestamp to a new value
2. Confirm
    - Video jumps to edited point and does not play
    - Timestamp updated in the textbox
    - Timestamp updated in the transcript
    - On export, the updated timestamp is present

## Deleting a track

1. Delete a track
2. Confirm
    - Track is not displayed in the transcript
    - On export, the updated timestamp is present
    - Focus landed on something reasonable

## Edit author name

1. Author name is edited to "John Doe"
2. Confirm
    - On export, the track's author is "John Doe"

## Set track language

1. Change track language to "FR-fr"
2. Confirm
    - lang="FR-fr" is assigned to relevant elements (eg, AD element, track elements, editable textbox)
    - On export, the track's language is "FR-fr"

### Default

1. Default value is "en-US". On load...
2. Confirm
    - lang="en-US" is assigned to relevant elements (eg, AD element, track elements, editable textbox)
    - On export, the track's language is "en-US"

### Validation

Only approved values can be selected

## Set video metadata: type

1. Edit video type {{option}}
2. Confirm
    - Display {{items}} for {{option}}
    - On export, the track's type is {{option}}
3. Edit each of {{items}}
4. Confirm
    - On export, the track's {{items}} have been updated

Option | Items
- Television episode | Season, Episode, Series Title, Title
- Movie | Title
- Music video | Title
- Other | Title, Creator

## Set video metadata items

See option/items above 

1. Edit video title to "Test"
2. Confirm
    - "Test" is displayed in the metadata
    - On export, the video's title is "Test"

## AD plays during video

1. Given a certain track listing, go to T-1s before track starts
2. Play 1s
3. Confirm
    - Track listing is updated

### Edited video causes AD to update

1. Update a track listing.
2. Go to T-1s before track starts
3. Play 1s
4. Confirm
    - Track listing is updated

## Export

1. Click export button
2. Confirm
    - Download is generated
    - Generated download looks correct

## Caching

### Enable caching

1. Enable caching
2. Edit something
3. Confirm
    - Cache saving functions were called
3. Reload page
4. Confirm cache was grabbed

### Disable caching

5. Disable cache
6. Confirm
 - Cache was cleared
7. Reload page
8. Confirm 
 - nothing was grabbed

### Handles empty cache

1. Given empty cache
2. Load page
3. Confirm:
  - cache grab function was called
  - empty display
  - no errors

## Different cache items
- current track
- author name
- author language

# Future

## Add track to existing track listing

## Edit existing track listing

## Create new language version of existing track listing

## Import tracks from existing transcript

### Select a range of tracks, copy them over, and adjust the start time of the range

## Track hygiene

- Indicate when a track already exists, or is too close to one
- Guess how long a track will take to speak