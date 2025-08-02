import { Image, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";

interface Album {
  id: string;
  name: string;
  release_date: string;
  images: Array<{ url: string; height: number; width: number }>;
  album_type: string;
  total_tracks: number;
}

const { width } = Dimensions.get('window');
const albumWidth = (width - 48) / 2;

const AlbumCard: React.FC<{ album: Album; onPress: (album: Album) => void }> = ({ album, onPress }) => {
  const coverImage = album.images && album.images.length > 0 ? album.images[0].url : null;
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear().toString() : '';
  
  return (
    <TouchableOpacity style={styles.albumCard} onPress={() => onPress(album)}>
      <Image 
        source={{ uri: coverImage || 'https://via.placeholder.com/400x400/333/fff?text=No+Image' }} 
        style={styles.albumCover} 
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={2}>{album.name}</Text>
        <Text style={styles.albumYear}>{releaseYear}</Text>
        <View style={styles.albumMeta}>
          <Text style={styles.albumType}>{album.album_type.toUpperCase()}</Text>
          {album.total_tracks && (
            <Text style={styles.albumTracks}>• {album.total_tracks} faixas</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    albumsSection: {
    paddingHorizontal: 16,
  },
  albumsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  yearSortButtonActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
  },
  yearSortText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
  },
  yearSortTextActive: {
    color: '#1DB954',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1DB954',
  },
  filterTabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumCard: {
    width: albumWidth,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  albumCover: {
    width: albumWidth,
    height: albumWidth,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  albumInfo: {
    padding: 12,
  },
  albumTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  albumYear: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  albumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumType: {
    color: '#1DB954',
    fontSize: 10,
    fontWeight: '500',
  },
  albumTracks: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
})


export default AlbumCard