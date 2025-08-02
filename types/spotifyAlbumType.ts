export type SpotifyAlbum = {
  id: string;
  name: string;
  label: string;
  album_type: string;
  popularity: number;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  uri: string;
  external_urls: {
    spotify: string;
  };
  images: {
    height: number;
    width: number;
    url: string;
  }[];
  artists: {
    id: string;
    name: string;
    uri: string;
    href: string;
    type: string;
    external_urls: {
      spotify: string;
    };
  }[];
  copyrights: {
    text: string;
    type: string; // "C" or "P"
  }[];
  genres: string[];
  tracks: {
    href: string;
    total: number;
    items: any[]; // pode detalhar mais se quiser listar faixas depois
  };
};