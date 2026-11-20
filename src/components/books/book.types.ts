export interface BookInput {
  title: string;
  author: string;
  year: number;
  genre: string;
  available: boolean;
}

export interface Book extends BookInput {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookFilters {
  genre?: string;
  available?: boolean;
}

/** Contrato de persistencia que necesita el servicio; no depende de MongoDB. */
export interface BookRepository {
  findAll(filters: BookFilters): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
  create(data: BookInput): Promise<Book>;
  update(id: string, data: BookInput): Promise<Book | null>;
  remove(id: string): Promise<boolean>;
}
