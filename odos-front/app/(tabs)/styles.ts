import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  input: { width: '100%', padding: 10, borderWidth: 1, borderRadius: 5, backgroundColor: '#FAF0CA', marginBottom: 10 },
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#f5f5f5',
  },
  
 
  recommendationsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: 'red',
    marginVertical: 10,
  },
  activityCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  activityImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  activityInfo: {
    padding: 10,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  activityCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityRating: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9529',
  },
  title: {
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    marginTop: 50,
    color: '#000000', 
    textAlign: 'center'
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%', 
  },
  interestBubble: {
    padding: 12,
    margin: 5,
    borderRadius: 50, 
    backgroundColor: '#E9C46A',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    maxWidth: 120, 
  },
  selectedBubble: {
    backgroundColor: '#2A9D8F',
    borderColor: '#2A9D8F',
  },
  interestText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  oddBubble: {
    marginRight: 10, 
  },
  evenBubble: {
    marginLeft: 10, 
  },
  button: {
    backgroundColor: '#F4A261', 
    padding: 15, 
    borderRadius: 25, 
    marginTop: 20, 
    width: '50%', 
    alignItems: 'center',
    opacity: 0.9,
  },
  buttonText: {
    color: 'white', 
    fontWeight: 'bold',
  },
});
export default styles;
