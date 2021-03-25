import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import { Text, StyleSheet, View, Image, Dimensions, ScrollView, Modal, TouchableOpacity, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import changeNavigationBarColor from "react-native-navigation-bar-color";
import LinearGradient from "react-native-linear-gradient";
import { globalColors, globalStyles } from "../styles/global";
import { ThemeContext } from "../utils/theme";
import { empty, separateThousands, abbreviateNumber, epoch, rgbToHex } from "../utils/utils";

const screenWidth = Dimensions.get("screen").width;
const screenHeight = Dimensions.get("screen").height;

export default function Holdings({ navigation }) {
	const { theme } = React.useContext(ThemeContext);

	const holdingsRef = React.createRef();

	const loadingText = "Loading...";

	const [pageKey, setPageKey] = React.useState(epoch());
	const [refresh, setRefresh] = React.useState();

	const [modal, setModal] = React.useState(false);
	const [coinID, setCoinID] = React.useState();
	const [coinAmount, setCoinAmount] = React.useState();

	const [holdingsValue, setHoldingsValue] = React.useState(loadingText);

	const [holdingsData, setHoldingsData] = React.useState([<Text key="loading" style={[styles.headerText, styles[`headerText${theme}`]]}>Loading...</Text>]);

	useEffect(() => {
		setRefresh();

		setHoldingsData([<Text key="loading" style={[styles.headerText, styles[`headerText${theme}`]]}>Loading...</Text>]);

		setPageKey(epoch());

		clearInterval(refresh);
		setRefresh();

		getHoldings();

		setRefresh(setInterval(() => {
			if(navigation.isFocused() && !empty(refresh)) {
				getHoldings();
			}
		}, 10000));
	}, [theme]);

	return (
		<View style={[styles.page, styles[`page${theme}`]]} key={pageKey}>
			<Modal animationType="fade" visible={modal} onRequestClose={() => { setCoinID(); setCoinAmount(); setModal(false)}} transparent={false}>
				<View style={styles.modalWrapper}>
					<View stlye={[styles.modal, styles[`modal${theme}`]]}>
						<TextInput style={[styles.input, styles[`input${theme}`]]} placeholder={"Coin ID... (e.g. Bitcoin)"} onChangeText={(value) => { setCoinID(value)}} value={coinID} placeholderTextColor={globalColors[theme].mainContrastLight}/>
						<TextInput style={[styles.input, styles[`input${theme}`]]} placeholder={"Amount... (e.g. 2.5)"} onChangeText={(value) => { setCoinAmount(value)}} value={coinAmount} placeholderTextColor={globalColors[theme].mainContrastLight}/>
						<View style={styles.buttonWrapper}>
							<TouchableOpacity style={styles.button} onPress={() => { setCoinID(); setCoinAmount(); setModal(false)}}>
								<Text style={styles.text}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.button, styles.buttonConfirm]} onPress={() => {  }}>
								<Text style={styles.text}>Confirm</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
			<LinearGradient style={[styles.card, { marginBottom:20 }]} colors={globalColors[theme].greenerGradient} useAngle={true} angle={45}>
				<Text style={[styles.cardText, styles[`cardText${theme}`]]}>{holdingsValue}</Text>
			</LinearGradient>
			<ScrollView ref={holdingsRef} style={[styles.tableWrapper, styles[`tableWrapper${theme}`]]} contentContainerStyle={{ paddingLeft:20, paddingTop:10, paddingBottom:10 }} nestedScrollEnabled={true}>
				{ !empty(holdingsData) &&
					holdingsData.map(row => {
						return row;
					})
				}
			</ScrollView>
			<TouchableOpacity onPress={() => { setModal(true)}}>
				<LinearGradient style={[styles.card, { marginTop:20 }]} colors={globalColors[theme].calmGradient} useAngle={true} angle={45}>
					<Text style={[styles.cardText, styles[`cardText${theme}`]]}>Add Coin</Text>
				</LinearGradient>
			</TouchableOpacity>
			<StatusBar style={theme === "Dark" ? "light" : "dark"}/>
		</View>
	);

	async function getHoldings() {
		setTimeout(() => {
			if(holdingsData[0] === <Text key="loading" style={[styles.headerText, styles[`headerText${theme}`]]}>Loading...</Text> && navigation.isFocused()) {
				getHoldings();
			}
		}, 5000);

		let api = await AsyncStorage.getItem("api");
		let token = await AsyncStorage.getItem("token");

		let endpoint = api + "holdings/read.php?platform=app&token=" + token;

		fetch(endpoint, {
			method: "GET",
			headers: {
				Accept: "application/json", "Content-Type": "application/json"
			}
		})
		.then((response) => {
			return response.json();
		})
		.then(async (coins) => {
			if(Object.keys(coins).length === 0) {
				if(navigation.isFocused()) {
					setHoldingsData([<Text key="empty" style={[styles.headerText, styles[`headerText${theme}`]]}>No Holdings Found.</Text>]);
				}
			} else {
				parseHoldings(coins).then(holdings => {
					let data = [];

					data.push(
						<View style={styles.row} key={epoch() + "holdings-header"}>
							<Text style={[styles.headerText, styles[`headerText${theme}`], styles.headerRank]}>#</Text>
							<Text style={[styles.headerText, styles[`headerText${theme}`], styles.headerCoin]}>Coin</Text>
							<Text style={[styles.headerText, styles[`headerText${theme}`], styles.headerAmount]}>Amount</Text>
						</View>
					);

					let rank = 0;

					Object.keys(holdings).map(holding => {
						rank += 1;

						let coin = holdings[holding];

						let icon = coin.image;
						let amount = coin.amount;
						let symbol = coin.symbol;

						data.push(
							<View style={styles.row} key={epoch() + holding}>
								<Text style={[styles.cellText, styles[`cellText${theme}`], styles.cellRank]}>{rank}</Text>
								<Image style={styles.cellImage} source={{uri:icon}}/>
								<Text style={[styles.cellText, styles[`cellText${theme}`], styles.cellSymbol]}>{symbol}</Text>
								<Text style={[styles.cellText, styles[`cellText${theme}`], styles.cellAmount]}>{amount}</Text>
							</View>
						);
					});

					if(navigation.isFocused()) {
						setHoldingsData(data);
					}
				}).catch(e => {
					console.log(e);
				});
			}
		}).catch(error => {
			console.log(error);
		});
	}

	function parseHoldings(coins) {
		return new Promise((resolve, reject) => {
			try {
				let list = Object.keys(coins).join("%2C");

				let endpoint = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + list + "&order=market_cap_desc&per_page=250&page=1&sparkline=false";

				fetch(endpoint, {
					method: "GET",
					headers: {
						Accept: "application/json", "Content-Type": "application/json"
					}
				})
				.then((json) => {
					return json.json();
				})
				.then(async (response) => {
					let holdingsValue = 0;

					let holdings = {};

					Object.keys(response).map(index => {
						let coin = response[index];
						let id = coin.id;
						let price = coin.current_price;
						let amount = coins[id].amount;
						let value = price * amount;
						let priceChangeDay = coin.price_change_percentage_24h;

						if(!empty(priceChangeDay)) {
							priceChangeDay = priceChangeDay.toFixed(2);
						} else {
							priceChangeDay = "-";
						}

						holdings[id] = {
							symbol:coins[id].symbol.toUpperCase(),
							amount:amount,
							value:value,
							price:price,
							change:priceChangeDay,
							image:coin.image
						};

						holdingsValue += value;
					});

					if(holdingsValue > 0 && navigation.isFocused()) {
						if(screenWidth > 380) {
							setHoldingsValue("$" + separateThousands(holdingsValue.toFixed(2)));
						} else {
							setHoldingsValue("$" + abbreviateNumber(holdingsValue, 2));
						}
					}

					resolve(Object.fromEntries(
						Object.entries(holdings).sort(([,a],[,b]) => b.value - a.value)
					));
				}).catch(error => {
					console.log(error);
					reject(error);
				});
			} catch(error) {
				reject(error);
			}
		});
	}
}

const styles = StyleSheet.create({
	page: {
		height:screenHeight - 180,
		backgroundColor:globalColors["Light"].mainSecond,
		padding:20
	},
	pageDark: {
		backgroundColor:globalColors["Dark"].mainSecond
	},
	modalWrapper: {
		width:"100%",
		height:"100%",
		flex:1,
		justifyContent:"center",
		alignItems:"center",
		backgroundColor:globalColors["Light"].accentFirst
	},
	modal: {
		width:300,
		height:300,
		alignItems:"center",
		backgroundColor:globalColors["Light"].mainFirst
	},
	modalDark: {
		backgroundColor:globalColors["Dark"].mainFirst
	},
	input: {
		backgroundColor:globalColors["Light"].mainFirst,
		color:globalColors["Light"].mainContrast,
		shadowColor:globalStyles.shadowColor,
		shadowOffset:globalStyles.shadowOffset,
		shadowOpacity:globalStyles.shadowOpacity,
		shadowRadius:globalStyles.shadowRadius,
		elevation:globalStyles.shadowElevation,
		borderRadius:globalStyles.borderRadius,
		paddingLeft:10,
		paddingRight:10,
		marginBottom:20,
		width:screenWidth - 200,
	},
	inputDark: {
		backgroundColor:globalColors["Dark"].mainFirst,
		color:globalColors["Dark"].mainContrast
	},
	buttonWrapper: {
		width:screenWidth - 200,
		flexDirection:"row"
	},
	button: {
		height:40,
		width:((screenWidth - 200) / 2) - 10,
		shadowColor:globalStyles.shadowColor,
		shadowOffset:globalStyles.shadowOffset,
		shadowOpacity:globalStyles.shadowOpacity,
		shadowRadius:globalStyles.shadowRadius,
		elevation:globalStyles.shadowElevation,
		borderRadius:globalStyles.borderRadius,
		alignItems:"center",
		justifyContent:"center",
		borderRadius:globalStyles.borderRadius,
		backgroundColor:globalColors["Dark"].mainFirst
	},
	buttonConfirm: {
		marginLeft:20,
		backgroundColor:globalColors["Light"].accentSecond
	},
	text: {
		lineHeight:38,
		fontFamily:globalStyles.fontFamily,
		fontSize:18,
		paddingBottom:2,
		color:globalColors["Light"].accentContrast
	},
	tableWrapper: {
		backgroundColor:globalColors["Light"].mainFirst,
		shadowColor:globalStyles.shadowColor,
		shadowOffset:globalStyles.shadowOffset,
		shadowOpacity:globalStyles.shadowOpacity,
		shadowRadius:globalStyles.shadowRadius,
		elevation:globalStyles.shadowElevation,
		borderRadius:globalStyles.borderRadius,
		maxHeight:screenHeight - 380
	},
	tableWrapperDark: {
		backgroundColor:globalColors["Dark"].mainFirst
	},
	row: {
		flexDirection:"row",
		alignItems:"center",
		padding:4
	},
	headerText: {
		fontSize:18,
		fontFamily:globalStyles.fontFamily,
		fontWeight:"bold",
		color:globalColors["Light"].mainContrastLight,
		marginBottom:4,
	},
	headerTextDark: {
		color:globalColors["Dark"].mainContrastLight
	},
	headerRank: {
		width:30
	},
	headerCoin: {
		width:100,
		marginLeft:15,
	},
	headerPrice: {

	},
	headerAmount: {

	},
	cellText: {
		color:globalColors["Light"].mainContrastLight
	},
	cellTextDark: {
		color:globalColors["Dark"].mainContrastLight
	},
	cellRank: {
		width:30
	},
	cellSymbol: {
		width:74
	},
	cellPrice: {

	},
	cellAmount: {

	},
	cellImage: {
		width:30,
		height:30,
		marginRight:10,
		borderRadius:15,
	},
	card: {
		shadowColor:globalStyles.shadowColor,
		shadowOffset:globalStyles.shadowOffset,
		shadowOpacity:globalStyles.shadowOpacity,
		shadowRadius:globalStyles.shadowRadius,
		elevation:globalStyles.shadowElevation,
		borderRadius:globalStyles.borderRadius,
		justifyContent:"center",
		alignItems:"center",
		height:60,
	},
	cardText: {
		lineHeight:56,
		paddingBottom:4,
		fontSize:20,
		fontFamily:globalStyles.fontFamily,
		color:globalColors["Light"].accentContrast,
		fontWeight:"bold",
		textAlign:"center"
	},
	cardTextDark: {
		color:globalColors["Dark"].accentContrast
	}
});