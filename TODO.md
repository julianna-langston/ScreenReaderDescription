# TODO List - Screen Reader Description Project

This document outlines planned features and improvements for the Screen Reader Description project, which provides audio descriptions for videos using screen readers.

## Bugs
- Can't figure out bridging with youtube
- SRD for bridged work on youtube doesn't read correctly. CSS issue? Does anything with youtube work?
- Dialog appears wrong when eding on youtube
- Maybe just fix editing on youtube?
- Localhost editor is stuck on television episode
- The "T" dialog always displays a list of other available episodes. That list should only be available when splicing.

## New Features

### Browser Extension Enhancements
- **Batch Export Functionality**: Allow users to export multiple transcript files at once
- **Offline Mode**: Enable description playback when offline using cached content
- **Multi-language Support**: Extend support for writing descriptions in multiple languages beyond English

### Editor Improvements
- **Bulk Operations**: Add features for bulk editing, moving, and deleting tracks
- **Undo/Redo System**: Implement full undo/redo functionality for all operations
- **Drafting Mode**: Create a drafting mode that allows users to work on descriptions without affecting the live/published versions, with the ability to save multiple drafts and switch between them

### Description List Features
- **Search and Filter**: Add search functionality to find specific episodes or series

## Improve Existing Features

### Browser Extension Issues
- **Emby Editor Integration**: Enable editor functionality for Emby platform (currently disabled due to injection issues)
  - File: `extension/src/emby.ts:5`
  - Issue: Can't confirm that Emby actually gets injected onto the emby site

- **YouTube Editing Mode**: Fix keyboard shortcut interception issues on YouTube
  - File: `extension/src/youtube.ts:4`
  - Issue: Can't use editing mode because all keystrokes are intercepted by YouTube before propagation can be stopped
  - Potential solutions: Move focus to different element, figure out how to stop propagation, or undo YouTube's actions

### Editor Testing Coverage
The following test cases need to be implemented in the editor:

#### Upload Functionality
- **Upload button - drop**: Test drag and drop file upload functionality
- **Upload button - upload file**: Test traditional file upload via button click

#### Track Management
- **Adding track at end**: Test adding tracks at the end of the timeline
- **Editing track's timestamp to move its index**: Test reordering tracks by changing timestamps

#### Splicer Component
- **You can open Splicer again after clicking 'Close'**: Test reopening splicer after closing
- **You can open Splicer again after ESCing out**: Test reopening splicer after ESC key

#### Timestamp Adjustment
- **Add 1 track that needs to adjust forward**: Test adding tracks that need forward timestamp adjustment
- **Add 1 track that needs to adjust backwards**: Test adding tracks that need backward timestamp adjustment  
- **Add several tracks that need to adjust**: Test adding multiple tracks requiring timestamp adjustments

### Performance and Stability
- **Memory Management**: Optimize memory usage for large transcript files
- **Error Handling**: Improve error handling and user feedback throughout the application
- **Loading Performance**: Optimize loading times for large description collections
- **Cross-browser Compatibility**: Ensure full compatibility across different browsers

### User Experience
- **Better Error Messages**: Provide more descriptive and helpful error messages
- **Loading Indicators**: Add loading indicators for long-running operations
- **Keyboard Navigation**: Improve keyboard navigation throughout all interfaces
- **Mobile Responsiveness**: Ensure all interfaces work well on mobile devices

### Data Management
- **Backup and Restore**: Implement backup and restore functionality for user data
- **Data Validation**: Add comprehensive validation for transcript data
- **Import/Export Formats**: Support additional file formats for importing/exporting descriptions
- **Data Migration**: Tools for migrating between different data formats

### Documentation and Support
- **User Guide**: Create comprehensive user documentation
- **Developer Documentation**: Improve code documentation and API references
- **Video Tutorials**: Create video tutorials for common tasks
- **FAQ Section**: Build frequently asked questions section

---

*Last updated: January 2025*

*This TODO list is maintained by the development team and updated regularly based on user feedback and project priorities.*
