import { useContext } from 'react';
import {Alert, Button, Row,Col,Stack ,  Form, FormGroup, FormLabel, FormControl, Container} from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const { loginInfo, updateLoginInfo, loginUser, isLoginLoading, loginError } = useContext(AuthContext);

    return ( <>
    <Form onSubmit={loginUser}>

        <Row style={{height : "100vh", justifyContent:"center", alignItems:"center", paddingTop:"100px"}}>
            <Col>
                <Stack gap={3}>
                    <h2>Login</h2>
                    <Form.Control 
                        type="email" 
                        placeholder="Email" 
                        required 
                        onChange={(e) => updateLoginInfo({...loginInfo, email: e.target.value})}
                    />
                    <Form.Control 
                        type="password" 
                        placeholder="Password" 
                        required 
                        onChange={(e) => updateLoginInfo({...loginInfo, password: e.target.value})}
                    />
                    
                    <Button variant="primary" type="submit">
                        {isLoginLoading ? "Logging you in..." : "Login"}
                    </Button>

                    {loginError?.error && (
                        <Alert variant='danger'>
                            <p>{loginError?.message}</p>
                        </Alert>
                    )}

                </Stack>
            </Col>
        </Row>
    </Form>
    
    </> );
}
 
export default Login;