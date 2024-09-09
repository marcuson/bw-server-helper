'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">Bitwarden Server Helper docs</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AppModule-982760031a80de42336bd949b2a943019312067de99aa7d536af54244f40548a2dad0d7d4c9475f766b499822e3a2198fb93908e95ee5a6259960996d9a34aee"' : 'data-bs-target="#xs-controllers-links-module-AppModule-982760031a80de42336bd949b2a943019312067de99aa7d536af54244f40548a2dad0d7d4c9475f766b499822e3a2198fb93908e95ee5a6259960996d9a34aee"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-982760031a80de42336bd949b2a943019312067de99aa7d536af54244f40548a2dad0d7d4c9475f766b499822e3a2198fb93908e95ee5a6259960996d9a34aee"' :
                                            'id="xs-controllers-links-module-AppModule-982760031a80de42336bd949b2a943019312067de99aa7d536af54244f40548a2dad0d7d4c9475f766b499822e3a2198fb93908e95ee5a6259960996d9a34aee"' }>
                                            <li class="link">
                                                <a href="controllers/HomeController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HomeController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/BackupModule.html" data-type="entity-link" >BackupModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/BitwardenModule.html" data-type="entity-link" >BitwardenModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-BitwardenModule-f6d38b8d1cd522d0217e1eee73902b960ffb01f78d78ff9d2dfcfdc8d85ac166f46a3627488f4f16572bc96796630dfc284da1ea597634ed06e41b6c32d4be3a"' : 'data-bs-target="#xs-injectables-links-module-BitwardenModule-f6d38b8d1cd522d0217e1eee73902b960ffb01f78d78ff9d2dfcfdc8d85ac166f46a3627488f4f16572bc96796630dfc284da1ea597634ed06e41b6c32d4be3a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-BitwardenModule-f6d38b8d1cd522d0217e1eee73902b960ffb01f78d78ff9d2dfcfdc8d85ac166f46a3627488f4f16572bc96796630dfc284da1ea597634ed06e41b6c32d4be3a"' :
                                        'id="xs-injectables-links-module-BitwardenModule-f6d38b8d1cd522d0217e1eee73902b960ffb01f78d78ff9d2dfcfdc8d85ac166f46a3627488f4f16572bc96796630dfc284da1ea597634ed06e41b6c32d4be3a"' }>
                                        <li class="link">
                                            <a href="injectables/BitwardenService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BitwardenService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/VersionModule.html" data-type="entity-link" >VersionModule</a>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#controllers-links"' :
                                'data-bs-target="#xs-controllers-links"' }>
                                <span class="icon ion-md-swap"></span>
                                <span>Controllers</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="controllers-links"' : 'id="xs-controllers-links"' }>
                                <li class="link">
                                    <a href="controllers/BackupController.html" data-type="entity-link" >BackupController</a>
                                </li>
                                <li class="link">
                                    <a href="controllers/VersionController.html" data-type="entity-link" >VersionController</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AppConfig.html" data-type="entity-link" >AppConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/AppConfigProps.html" data-type="entity-link" >AppConfigProps</a>
                            </li>
                            <li class="link">
                                <a href="classes/Backup.html" data-type="entity-link" >Backup</a>
                            </li>
                            <li class="link">
                                <a href="classes/Version.html" data-type="entity-link" >Version</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/BackupSchedule.html" data-type="entity-link" >BackupSchedule</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BackupService.html" data-type="entity-link" >BackupService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/BackupOptions.html" data-type="entity-link" >BackupOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BWExportOptions.html" data-type="entity-link" >BWExportOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Collection.html" data-type="entity-link" >Collection</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Deviceapprovalproperties.html" data-type="entity-link" >Deviceapprovalproperties</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Folder.html" data-type="entity-link" >Folder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Group.html" data-type="entity-link" >Group</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ItemIdentity.html" data-type="entity-link" >ItemIdentity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ItemLogin.html" data-type="entity-link" >ItemLogin</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LockunlockSuccess.html" data-type="entity-link" >LockunlockSuccess</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LockunlockSuccessData.html" data-type="entity-link" >LockunlockSuccessData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MoveItemidOrganizationIdPostRequest.html" data-type="entity-link" >MoveItemidOrganizationIdPostRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SendText.html" data-type="entity-link" >SendText</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Status.html" data-type="entity-link" >Status</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnlockPostRequest.html" data-type="entity-link" >UnlockPostRequest</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});