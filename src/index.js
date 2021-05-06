// eslint-disable-next-line
import css from './index.css';
// eslint-disable-next-line require-jsdoc
import Uploader from './uploader';
import Ui from './ui';
import Tunes from './tunes';
import toolboxIcon from './svg/toolbox.svg';

// eslint-disable-next-line require-jsdoc
export default class Gallery {
  /**
   * Notify core that read-only mode is supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @return {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      title: 'Gallery',
      icon: toolboxIcon
    };
  }

  /**
   * @param {GalleryData} data - previously saved data
   * @param {GalleryConfig} config - user config for Tool
   * @param {object} api - Editor.js API
   * @param {boolean} tool.readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.data = data;

    if ('images' in this.data && this.data.images.length > 0) {
      this.dirtyData = data;
    } else {
      this.dirtyData = {
        images: []
      };
    }
    this.readOnly = readOnly;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoints: config.endpoints || '',
      additionalRequestData: config.additionalRequestData || {},
      additionalRequestHeaders: config.additionalRequestHeaders || {},
      field: config.field || 'image',
      types: config.types || 'image/*',
      captionPlaceholder: this.api.i18n.t('Caption'),
      buttonContent: config.buttonContent || '',
      uploader: config.uploader || undefined,
      actions: config.actions || [],
    };

    /**
     * Module for file uploading
     */
    this.uploader = new Uploader({
      config: this.config,
      onUpload: (response) => this.onUpload(response),
      onError: (error) => this.uploadingFailed(error)
    });

    /**
     * Module for working with UI
     */
    this.ui = new Ui({
      api,
      config: this.config,
      onSelectFile: () => {
        this.uploader.uploadSelectedFile({
          onPreview: (src) => {
            this.ui.showPreloader(src);
          },
        });
      },
      readOnly,
    });

    /**
     * Module for working with tunes
     */
    this.tunes = new Tunes({
      api,
      actions: this.config.actions,
      onChange: (tuneName) => this.tuneToggled(tuneName),
    });

    Tunes.tunes.forEach(({ name: tune }) => {
      const value = typeof data[tune] !== 'undefined' ? data[tune] === true || data[tune] === 'true' : false;
      this.setTune(tune, value);
    });
  }

  /**
   * Renders Block content
   * @public
   *
   * @return {HTMLDivElement}
   */
  render() {
    return this.ui.render(this.data);
  }

  // eslint-disable-next-line require-jsdoc
  save() {
    var cleanData = [];
    var images = this.ui.getImages();

    var image = null;
    var imageName = null;
    var rawData = null;
    var caption = null;

    for (var i = 0; i < images.length; i++) {
      image = images[i];
      imageName = image.firstChild.value;
      caption = image.lastChild.value;
      for (var j = 0; j < this.dirtyData.images.length; j++) {
        rawData = this.dirtyData.images[j];
        if (imageName == rawData.file.name) {
          rawData.caption = caption;
          cleanData.push(rawData);
          continue;
        }
      }
    }
    this.data.images = cleanData;
    return this.data;
  }

  /**
   * File uploading callback
   * @private
   *
   * @param {Response} response
   */
  onUpload(response) {
    if (response.success && response.file) {
      var file = this.ui.uploadFile(response.file);
      var object = {
        file: file,
        caption: null
      };
      this.dirtyData.images.push(object);
    } else {
      this.uploadingFailed('incorrect response: ' + JSON.stringify(response));
    }
  }

  /**
   * Handle uploader errors
   * @private
   *
   * @param {string} errorText
   */
  uploadingFailed(errorText) {
    console.log('Gallery : uploading failed because of', errorText);

    this.api.notifier.show({
      message: this.api.i18n.t('Can not upload an image, try another'),
      style: 'error'
    });
  }

  /**
   * Makes buttons with tunes: add background, add border, stretch image
   *
   * @public
   *
   * @returns {Element}
   */
  renderSettings() {
    return this.tunes.render(this.data);
  }

  /**
   * Fires after clicks on the Toolbox Image Icon
   * Initiates click on the Select File button
   *
   * @public
   */
  appendCallback() {
    this.ui.nodes.fileButton.click();
  }

  /**
   * Callback fired when Block Tune is activated
   *
   * @private
   *
   * @param {string} tuneName - tune that has been clicked
   * @returns {void}
   */
  tuneToggled(tuneName) {
    // inverse tune state
    this.setTune(tuneName, !this.data[tuneName]);
  }

  /**
   * Set one tune
   *
   * @param {string} tuneName - {@link Tunes.tunes}
   * @param {boolean} value - tune state
   * @returns {void}
   */
  setTune(tuneName, value) {
    this.data[tuneName] = value;

    this.ui.applyTune(tuneName, value);
  }
}
