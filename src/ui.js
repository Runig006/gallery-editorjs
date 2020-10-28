import buttonIcon from './svg/button-icon.svg';
import closeIcon from './svg/close-icon.svg';

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * @param {object} ui - image tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {GalleryConfig} ui.config - user config
   * @param {Function} ui.onSelectFile - callback for clicks on Select file button
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({ api, config, onSelectFile, readOnly }) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.readOnly = readOnly;
    this.nodes = {
      list: make('div', [ this.CSS.list ]),
      // item: make('div', [ this.CSS.baseClass, this.CSS.wrapper ]),
      wrapper: make('div', [this.CSS.wrapper]),
      // imageContainer: make('div', [ this.CSS.imageContainer ]),
      // fileButton: this.createFileButton(),
      addButton: this.createAddButton(),
      // imageEl: undefined,
      // imagePreloader: make('div', this.CSS.imagePreloader),
      // caption: make('div', [ this.CSS.input, this.CSS.caption ], {
      //   contentEditable: !this.readOnly,
      // }),
    };

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
    this.nodes.list.appendChild(this.nodes.addButton);
    this.nodes.wrapper.appendChild(this.nodes.list);
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS() {
    return {
      /**
       * Tool's classes
       */
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
      itemEmpty: 'gallery-item--empty',
      removeBtn: 'gallery-removeBtn',
      inputUrl: 'gallery-inputUrl',
      caption: 'gallery-caption',
      list: 'gallery-list',
      imagePreloader: 'image-tool__image-preloader'
    };
  };

  /**
   * Ui statuses:
   * - empty
   * - uploading
   * - filled
   *
   * @returns {{EMPTY: string, UPLOADING: string, FILLED: string}}
   */
  static get status() {
    return {
      EMPTY: 'empty',
      UPLOADING: 'loading',
      FILLED: 'filled',
    };
  }

  getImages() {
    return this.nodes.list.getElementsByClassName(this.CSS.item);
  }

  /**
   * Renders tool UI
   *
   * @param {GalleryToolData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData) {
    if (!toolData.images || Object.keys(toolData.images).length === 0) {
      // Если мало данных то мы ставим статус пусто
      this.toggleStatus(Ui.status.EMPTY);
    } else {
      for (const load of toolData.images) {
        const loadItem = this.creteNewItem(load.url, load.caption);

        this.nodes.list.insertBefore(loadItem, this.addButton);
      }
      // Если есть изображение то статус загрузка
      this.toggleStatus(Ui.status.UPLOADING);
    }
    return this.nodes.wrapper;
  }


  /**
   * Create add button
   * @private
   */
  createAddButton() {
    const addButton = make('div', [this.CSS.button, this.CSS.addButton]);
    const block = make('div', [ this.CSS.block ]);

    addButton.innerHTML = this.config.buttonContent || `${buttonIcon} Add Image`;
    addButton.addEventListener('click', () => {
      this.onSelectFile();
    });
    block.appendChild(addButton);

    return block;
  }

  /**
   * Creates upload-file button
   *
   * @return {Element}
   */
  createFileButton() {
    const button = make('div', [ this.CSS.button ]);

    button.innerHTML = this.config.buttonContent || `${buttonIcon} ${this.api.i18n.t('Select an Image')}`;

    button.addEventListener('click', () => {
      this.onSelectFile();
    });

    return button;
  }

  /**
   * Shows uploading preloader
   *
   * @param {string} src - preview source
   * @returns {void}
   */
  showPreloader(src) {
    const newItem = this.creteNewItem('', '');
    newItem.firstChild.lastChild.style.backgroundImage = `url(${src})`;
    console.log('preload', newItem.firstChild.lastChild);
    this.nodes.list.insertBefore(newItem, this.addButton);
    console.log(src);
  }

  /**
   * Shows an image
   *
   * @param {string} url - image source
   * @returns {void}
   */
  fillImage(url) {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = /\.mp4$/.test(url) ? 'VIDEO' : 'IMG';

    const attributes = {
      src: url,
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     *
     * @type {string}
     */
    let eventName = 'load';

    /**
     * Update attributes and eventName if source is a mp4 video
     */
    if (tag === 'VIDEO') {
      /**
       * Add attributes for playing muted mp4 as a gif
       *
       * @type {boolean}
       */
      attributes.autoplay = true;
      attributes.loop = true;
      attributes.muted = true;
      attributes.playsinline = true;

      /**
       * Change event to be listened
       *
       * @type {string}
       */
      eventName = 'loadeddata';
    }

    /**
     * Compose tag with defined attributes
     *
     * @type {Element}
     */
    this.nodes.imageEl = make(tag, this.CSS.imageEl, attributes);

    /**
     * Add load event listener
     */
    this.nodes.imageEl.addEventListener(eventName, () => {
      this.toggleStatus(Ui.status.FILLED);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.imagePreloader) {
        this.nodes.imagePreloader.style.backgroundImage = '';
      }
    });

    this.nodes.imageContainer.appendChild(this.nodes.imageEl);
  }

  /**
   * Shows caption input
   *
   * @param {string} text - caption text
   * @returns {void}
   */
  fillCaption(text) {
    if (this.nodes.caption) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Changes UI status
   *
   * @param {string} status - see {@link Ui.status} constants
   * @returns {void}
   */
  toggleStatus(status) {
    for (const statusType in Ui.status) {
      // eslint-disable-next-line no-prototype-builtins
      if (Ui.status.hasOwnProperty(statusType)) {
        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${Ui.status[statusType]}`, status === Ui.status[statusType]);
      }
    }
  }

  /**
   * Apply visual representation of activated tune
   *
   * @param {string} tuneName - one of available tunes {@link Tunes.tunes}
   * @param {boolean} status - true for enable, false for disable
   * @returns {void}
   */
  applyTune(tuneName, status) {
    this.nodes.list.classList.toggle(`${this.CSS.list}--${tuneName}`, status);
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

  uploadFile(file) {
    this._createImage(file.url, this.nodes.list.childNodes[this.nodes.list.childNodes.length - 1].firstChild, '', this.nodes.list.childNodes[this.nodes.list.childNodes.length - 1].firstChild.childNodes[1]);
    this.nodes.list.childNodes[this.nodes.list.childNodes.length - 1].firstChild.childNodes[2].style.backgroundImage = '';
    this.nodes.list.childNodes[this.nodes.list.childNodes.length - 1].firstChild.firstChild.value = file.url;
    this.nodes.list.childNodes[this.nodes.list.childNodes.length - 1].firstChild.classList.add(this.CSS.itemEmpty);
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
}

/**
 * Helper for making Elements with attributes
 *
 * @param  {string} tagName           - new Element tag name
 * @param  {Array|string} classNames  - list or name of CSS class
 * @param  {object} attributes        - any attributes
 * @returns {Element}
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
