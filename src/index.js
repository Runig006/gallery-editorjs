// eslint-disable-next-line
import css from './index.css';
// eslint-disable-next-line require-jsdoc
import Uploader from './uploader';
import Ui from './ui';
import Tunes from './tunes';
import toolboxIcon from './svg/toolbox.svg';
import buttonIcon from './svg/button-icon.svg';
import closeIcon from './svg/close-icon.svg';

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
      captionPlaceholder: this.api.i18n.t(config.captionPlaceholder || 'Caption'),
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
   * CSS classes
   * @constructor
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'gallery-wrapper',
      addButton: 'gallery-addImage',
      block: 'gallery-block',
      item: 'gallery-item',
      removeBtn: 'gallery-removeBtn',
      inputUrl: 'gallery-inputUrl',
      caption: 'gallery-caption',
      list: 'gallery-list',
      imagePreloader: 'image-tool__image-preloader'
    };
  };

  /**
   * Renders Block content
   * @public
   *
   * @return {HTMLDivElement}
   */
  render() {
    /*
     * Structure
     * <wrapper>
     *  <list>
     *    <item/>
     *    ...
     *  </list>
     *  <addButton>
     * </wrapper>
     */
    // Создаем базу для начала
    this.wrapper = make('div', [ this.CSS.wrapper ]);
    this.list = make('div', [ this.CSS.list ]);
    this.addButton = this.createAddButton();

    this.list.appendChild(this.addButton);
    this.wrapper.appendChild(this.list);
    if (typeof this.data.images !== 'undefined' && this.data.images.length > 0) {
      for (const load of this.data.images) {
        const loadItem = this.creteNewItem(load.url, load.caption);

        this.list.insertBefore(loadItem, this.addButton);
      }
    }
    return this.wrapper;
  }

  // eslint-disable-next-line require-jsdoc
  save(blockContent) {
    const list = blockContent.getElementsByClassName(this.CSS.item);
    const images = [];

    if (list.length > 0) {
      for (const item of list) {
        if (item.firstChild.value) {
          images.push({
            url: item.firstChild.value,
            caption: item.lastChild.value
          });
        }
      }
    }
    this.data.images = images;
    return this.data;
  }

  /**
   * Create Image block
   * @public
   *
   * @param {string} url - url of saved or upload image
   * @param {string} caption - caption of image
   *
   * Structure
   * <item>
   *  <url/>
   *  <removeButton/>
   *  <img/>
   *  <caption>
   * </item>
   *
   * @return {HTMLDivElement}
   */
  creteNewItem(url, caption) {
    // Create item, remove button and field for image url
    const block = make('div', [ this.CSS.block ]);
    const item = make('div', [ this.CSS.item ]);
    const removeBtn = make('div', [ this.CSS.removeBtn ]);
    const imageUrl = make('input', [ this.CSS.inputUrl ]);
    const imagePreloader = make('div', [ this.CSS.imagePreloader ]);

    imageUrl.value = url;
    removeBtn.innerHTML = closeIcon;
    removeBtn.addEventListener('click', () => {
      block.remove();
    });
    removeBtn.style.display = 'none';

    item.appendChild(imageUrl);
    item.appendChild(removeBtn);
    block.appendChild(item);
    /*
     * If data already yet
     * We create Image view
     */
    if (url) {
      this._createImage(url, item, caption, removeBtn);
    } else {
      item.appendChild(imagePreloader);
    }
    return block;
  }

  /**
   * Create Image View
   * @public
   *
   * @param {string} url - url of saved or upload image
   * @param {HTMLDivElement} item - block of created image
   * @param {string} captionText - caption of image
   * @param {HTMLDivElement} removeBtn - button for remove image block
   *
   * @return {HTMLDivElement}
   */
  _createImage(url, item, captionText, removeBtn) {
    const image = document.createElement('img');
    const caption = make('input', [this.CSS.caption, this.CSS.input]);

    image.src = url;
    if (captionText) {
      caption.value = captionText;
    }
    caption.placeholder = 'Caption...';

    removeBtn.style.display = 'flex';

    item.appendChild(image);
    item.appendChild(caption);
  }

  /**
   * File uploading callback
   * @private
   *
   * @param {Response} response
   */
  onUpload(response) {
    if (response.success && response.file) {
      this._createImage(response.file.url, this.list.childNodes[this.list.childNodes.length - 2].firstChild, '', this.list.childNodes[this.list.childNodes.length - 2].firstChild.childNodes[1]);
      this.list.childNodes[this.list.childNodes.length - 2].firstChild.childNodes[2].style.backgroundImage = '';
      this.list.childNodes[this.list.childNodes.length - 2].firstChild.firstChild.value = response.file.url;
      this.list.childNodes[this.list.childNodes.length - 2].firstChild.classList.add('gallery-item--empty');
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
      message: 'Can not upload an image, try another',
      style: 'error'
    });
  }

  /**
   * Shows uploading preloader
   * @param {string} src - preview source
   */
  showPreloader(src) {
    this.nodes.imagePreloader.style.backgroundImage = `url(${src})`;
  }

  // eslint-disable-next-line require-jsdoc
  onSelectFile() {
    // Создаем элемент
    this.uploader.uploadSelectedFile({
      onPreview: (src) => {
        const newItem = this.creteNewItem('', '');
        newItem.firstChild.lastChild.style.backgroundImage = `url(${src})`;
        console.log('preload', newItem.firstChild.lastChild);
        this.list.insertBefore(newItem, this.addButton);
        console.log(src);
      }
    });
  }

  /**
   * Create add button
   * @private
   */
  createAddButton() {
    const addButton = make('div', [this.CSS.button, this.CSS.addButton]);
    const block = make('div', [ this.CSS.block ]);

    addButton.innerHTML = `${buttonIcon} Add Image`;
    addButton.addEventListener('click', () => {
      this.onSelectFile();
    });
    block.appendChild(addButton);

    return block;
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

/**
 * Helper for making Elements with attributes
 *
 * @param  {string} tagName           - new Element tag name
 * @param  {array|string} classNames  - list or name of CSS class
 * @param  {Object} attributes        - any attributes
 * @return {Element}
 */
export const make = function make(tagName, classNames = null, attributes = {}) {
  const el = document.createElement(tagName);

  if (Array.isArray(classNames)) {
    el.classList.add(...classNames);
  } else if (classNames) {
    el.classList.add(classNames);
  }

  for (const attrName in attributes) {
    el[attrName] = attributes[attrName];
  }

  return el;
};
