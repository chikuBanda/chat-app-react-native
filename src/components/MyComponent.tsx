import { Text, View } from "react-native"

type Props = {
    name: string,
    girlfriend: string,
    thoughts: string
}

const MyComponent = (props: Props) => {
    return (
        <View>
            <Text>Hello my name is { props.name }</Text>
            <Text>My girlfriend is { props.girlfriend }</Text>
            <Text style={ { marginTop: 10 } }>
                { props.thoughts }
            </Text>
        </View>
    )
}

export default MyComponent