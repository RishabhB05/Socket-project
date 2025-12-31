import {useContext} from 'react';
import {Alert, Button, Row,Col,Stack ,  Form, FormGroup, FormLabel, FormControl, Container} from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

const Register = () => {

    const  {registerInfo, updateRegisterInfo, registerUser, isRegisterLoading, registerError} = useContext(AuthContext);
    return ( <>
    <Form onSubmit={registerUser}>

        <Row style={{height : "100vh", justifyContent:"center", alignItems:"center", paddingTop:"100px"}}>
            <Col>
                <Stack gap={3}>
                    <h2>Register</h2>

                    <Form.Control type="text" placeholder="Username" required onChange ={(e) => updateRegisterInfo({...registerInfo, name: e.target.value})} />
                    <Form.Control type="email" placeholder="Email" required onChange ={(e) => updateRegisterInfo({...registerInfo, email: e.target.value})} />
                    <Form.Control type="password" placeholder="Password" required onChange ={(e) => updateRegisterInfo({...registerInfo, password: e.target.value})} />
                    
                    <Button variant="primary" type="submit">
                        {isRegisterLoading ? "Creating your account..." : "Register"}
                    </Button>
                 
                    {registerError?.error && (
                        <Alert variant='danger'>
                            <p>{registerError?.message}</p>
                        </Alert>
                    )}

                </Stack>
            </Col>
        </Row>
    </Form>
    
    </> );
}
 
export default Register;