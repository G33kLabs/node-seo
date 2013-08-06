-- phpMyAdmin SQL Dump
-- version 4.0.4.1
-- http://www.phpmyadmin.net
--
-- Client: localhost
-- Généré le: Sam 03 Août 2013 à 02:42
-- Version du serveur: 5.5.29
-- Version de PHP: 5.4.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données: `traderfo`
--

-- --------------------------------------------------------

--
-- Structure de la table `seo_crawl`
--

CREATE TABLE IF NOT EXISTS `seo_crawl` (
  `url` varchar(254) NOT NULL,
  `status_code` varchar(32) DEFAULT NULL,
  `load_time` int(10) DEFAULT NULL,
  `meta_canonical` varchar(254) DEFAULT NULL,
  `meta_title` text,
  `meta_desc` text,
  `meta_keywords` text,
  `meta_noindex` tinyint(1) DEFAULT NULL,
  `meta_nofollow` tinyint(1) DEFAULT NULL,
  `plugins` mediumtext,
  `referer` varchar(254) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `crawled_at` datetime DEFAULT NULL,
  UNIQUE KEY `url` (`url`),
  KEY `status_code` (`status_code`),
  KEY `load_time` (`load_time`),
  KEY `crawled_at` (`crawled_at`),
  KEY `meta_robots` (`meta_noindex`),
  KEY `created_at` (`created_at`),
  KEY `meta_canonical` (`meta_canonical`),
  FULLTEXT KEY `meta_description` (`meta_desc`),
  FULLTEXT KEY `meta_title` (`meta_title`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
