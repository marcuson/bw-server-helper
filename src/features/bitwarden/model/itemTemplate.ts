/**
 * Vault Management API
 * This schema documents the endpoints available to the Vault Management API, accessible from the Bitwarden CLI using the `bw serve` command ([learn more](https://bitwarden.com/help/cli/)). If you\'re looking for the **Organization Management** API, refer instead to [this document](https://bitwarden.com/help/api/).
 *
 * The version of the OpenAPI document: latest
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { Field } from './field';
import { ItemCard } from './itemCard';
import { ItemSecureNote } from './itemSecureNote';
import { ItemLogin } from './itemLogin';
import { ItemIdentity } from './itemIdentity';


export interface ItemTemplate { 
    organizationId?: string;
    collectionIds?: Array<string>;
    folderId?: string;
    type?: ItemTemplate.TypeEnum;
    name?: string;
    notes?: string;
    favorite?: boolean;
    fields?: Array<Field>;
    login?: ItemLogin;
    secureNote?: ItemSecureNote;
    card?: ItemCard;
    identity?: ItemIdentity;
    reprompt?: ItemTemplate.RepromptEnum;
}
export namespace ItemTemplate {
    export type TypeEnum = 1 | 2 | 3 | 4;
    export const TypeEnum = {
        NUMBER_1: 1 as TypeEnum,
        NUMBER_2: 2 as TypeEnum,
        NUMBER_3: 3 as TypeEnum,
        NUMBER_4: 4 as TypeEnum
    };
    export type RepromptEnum = 0 | 1;
    export const RepromptEnum = {
        NUMBER_0: 0 as RepromptEnum,
        NUMBER_1: 1 as RepromptEnum
    };
}


