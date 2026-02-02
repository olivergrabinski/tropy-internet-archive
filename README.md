<p align="center"><img src="icon.svg" width="150px" height="auto"></p>

<h1 align="center">tropy-plugin-internet-archive</h1>

This is a plugin for [Tropy](https://tropy.org). It can upload selected items to the [Internet Archive](https://archive.org).

## Installation

Download the `.zip` file, named `tropy-plugin-internet-archive` plus a version number, from the [latest release](https://github.com/tropy/tropy-plugin-internet-archive/releases/latest) on GitHub. In Tropy, navigate to *Preferences… > Plugins* and click *Install Plugin* to select the downloaded ZIP file.

## Plugin configuration

To configure the plugin, click its *Settings* button in *Preferences > Plugins*:

- Choose a plugin *Name* that will show up in the *File > Export* menu.
- Fill in the *Internet Archive Access Key* and *Internet Archive Secret Key* fields, which you can obtain from your Internet Archive account settings.
- Optionally, specify the *Collection* identifier where items will be uploaded (defaults to "opensource").
- Use the *+* icon at the far right to create new plugin instances (so you can have multiple configurations in parallel).

To obtain Internet Archive API credentials:
1. Create an account at [archive.org](https://archive.org)
2. Go to your account settings
3. Generate S3 API keys

## Usage

Select the items to upload, then click *File > Export > tropy-plugin-internet-archive* to start the upload. The plugin will upload the selected items and their associated photos to the Internet Archive.

Each Tropy item will create a new Internet Archive item with a unique identifier. All photos associated with the item will be uploaded as files. The plugin will provide direct links to the uploaded items in the activity log.

## Metadata mapping

The plugin maps Dublin Core fields from Tropy items to Internet Archive metadata headers. Multi-valued fields are sent using numbered headers like `x-archive-meta01-subject`, `x-archive-meta02-subject`.

| Dublin Core field | Internet Archive header |
| --- | --- |
| `title` | `x-archive-meta-title` |
| `description` | `x-archive-meta-description` |
| `creator` | `x-archive-meta-creator` |
| `contributor` | `x-archive-meta-contributor` |
| `publisher` | `x-archive-meta-publisher` |
| `date` | `x-archive-meta-date` |
| `language` | `x-archive-meta-language` |
| `subject` | `x-archive-meta-subject` |
| `type` | `x-archive-meta-type` |
| `format` | `x-archive-meta-format` |
| `identifier` | `x-archive-meta-identifier` |
| `source` | `x-archive-meta-source` |
| `relation` | `x-archive-meta-relation` |
| `coverage` | `x-archive-meta-coverage` |
| `rights` | `x-archive-meta-rights` |

When a value contains non-ASCII characters, it is encoded as `uri(<percent-encoded-utf8>)` per Internet Archive guidance.

## Feedback

Missing a feature or having problems? Please head over to the [Tropy forums](https://forums.tropy.org/) and let us know.
