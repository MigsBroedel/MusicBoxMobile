export default interface Review {
  id: string;
  user: {
    id: string;
    name: string;
    pfp?: string;
    spotifyID: string;
  };
  albumid: string;
  nota: number;
  likes: number;
  text: string;
  createdAt: string;
}