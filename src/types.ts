export interface Order {
    tokendId: string;
    price: string;
    link: string;
}

export interface Link {
    link: string;
    token: number;
}

export interface Metadata {
    traits: object;
    token: number;
}