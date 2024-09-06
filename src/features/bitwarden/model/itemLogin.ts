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
import { Uris } from './uris';


export interface ItemLogin { 
    uris?: Uris;
    username?: string;
    password?: string;
    totp?: string;
}

