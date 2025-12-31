import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {Container, Nav, Navbar as BootstrapNavbar, Stack } from 'react-bootstrap';
import {Link} from 'react-router-dom';

const Navbar = () => {

 const { user, logoutUser } = useContext(AuthContext);



  return (
    <BootstrapNavbar bg="dark" variant="dark" className="mb-4">
      <Container>
        <h2>
          <Link to="/" className="link-light text-decoration-none">
            Chat Application
          </Link>
        </h2>
   
        {user && <span className="text-warning">Logged in as {user?.name}</span>}

        <Nav>
            <Stack direction='horizontal' gap={3}>
                {user ? (
                    <Link 
                        to="/login" 
                        onClick={logoutUser}
                        className="link-light text-decoration-none"
                    >
                        Logout
                    </Link>
                ) : (
                    <>
                        <Link to="/login" className="link-light text-decoration-none">
                            Login
                        </Link>
                        <Link to="/register" className="link-light text-decoration-none">
                            Register
                        </Link>
                    </>
                )}
            </Stack>
        </Nav>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;